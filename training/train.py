"""Fine-tune a transformer for binary fake/real news classification.

    pip install -r training/requirements.txt
    python training/train.py --sample 200 --epochs 1 --max-length 128    # smoke run
    python training/train.py --model distilroberta-base --push-to-hub user/repo

Labels are always saved as {0: FAKE, 1: REAL}, so the API's fake index is 0.
"""

import argparse
import json
from pathlib import Path

import numpy as np
import torch
from datasets import DatasetDict, load_dataset
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)

ID2LABEL = {0: "FAKE", 1: "REAL"}
LABEL2ID = {name: i for i, name in ID2LABEL.items()}
HUB_DATASET = "GonzaloA/fake_news"


def parse_args():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--model", default="distilroberta-base")
    p.add_argument("--csv", help="CSV with columns text,label (+ optional title); replaces the Hub dataset")
    p.add_argument("--label-fake", default=None,
                   help="raw label value meaning fake (default: 0 for the Hub dataset, 1 for --csv)")
    p.add_argument("--max-length", type=int, default=512)
    p.add_argument("--epochs", type=float, default=2)
    p.add_argument("--lr", type=float, default=2e-5)
    # 4 x 4 accumulation = effective batch 16; batch 4 at 512 tokens fits 4 GB with fp16 + checkpointing
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--grad-accum", type=int, default=4)
    p.add_argument("--output", type=Path)
    p.add_argument("--push-to-hub", metavar="USER/REPO")
    p.add_argument("--sample", type=int, metavar="N", help="use N training rows (N//2 for val/test)")
    p.add_argument("--seed", type=int, default=42)
    return p.parse_args()


def load_splits(args):
    if args.csv:
        data = load_dataset("csv", data_files=args.csv)["train"]
        held_out = data.train_test_split(test_size=0.2, seed=args.seed)
        half = held_out["test"].train_test_split(test_size=0.5, seed=args.seed)
        splits = DatasetDict(train=held_out["train"], validation=half["train"], test=half["test"])
        label_fake = args.label_fake or "1"
    else:
        splits = load_dataset(HUB_DATASET)
        label_fake = args.label_fake or "0"  # GonzaloA/fake_news: 0 = fake, 1 = real

    def prepare(row):
        title = row.get("title") or ""
        return {
            "text": f"{title} {row['text'] or ''}".strip(),
            "label": int(str(row["label"]) != label_fake),
        }

    keep = ["text", "label"]
    return DatasetDict({
        name: ds.map(prepare, remove_columns=[c for c in ds.column_names if c not in keep]).select_columns(keep)
        for name, ds in splits.items()
    })


def drop_leakage(splits):
    seen = set()
    train = splits["train"].filter(lambda r: not (r["text"] in seen or seen.add(r["text"])))
    train_texts = set(train["text"])
    out = DatasetDict(train=train)
    for name in ("validation", "test"):
        out[name] = splits[name].filter(lambda r: r["text"] not in train_texts)
        print(f"{name}: kept {len(out[name])}/{len(splits[name])} rows not in train")
    return out


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    # Fake is the class of interest, so precision/recall/f1 are reported for FAKE.
    precision, recall, f1, _ = precision_recall_fscore_support(
        labels, preds, pos_label=LABEL2ID["FAKE"], average="binary", zero_division=0
    )
    return {"accuracy": accuracy_score(labels, preds), "precision": precision, "recall": recall, "f1": f1}


def main():
    args = parse_args()
    output = args.output or Path("training/out") / args.model.split("/")[-1]

    splits = drop_leakage(load_splits(args))
    if args.sample:
        splits["train"] = splits["train"].shuffle(seed=args.seed).select(range(min(args.sample, len(splits["train"]))))
        for name in ("validation", "test"):
            splits[name] = splits[name].shuffle(seed=args.seed).select(range(min(args.sample // 2, len(splits[name]))))

    tokenizer = AutoTokenizer.from_pretrained(args.model)
    tokenized = splits.map(
        lambda batch: tokenizer(batch["text"], truncation=True, max_length=args.max_length),
        batched=True,
        remove_columns=["text"],
    )
    model = AutoModelForSequenceClassification.from_pretrained(
        args.model, num_labels=2, id2label=ID2LABEL, label2id=LABEL2ID
    )

    training_args = TrainingArguments(
        output_dir=str(output / "checkpoints"),
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size * 2,
        gradient_accumulation_steps=args.grad_accum,
        gradient_checkpointing=True,
        fp16=torch.cuda.is_available(),
        warmup_ratio=0.06,
        weight_decay=0.01,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=1,
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        logging_steps=50,
        report_to="none",
        seed=args.seed,
        push_to_hub=bool(args.push_to_hub),
        hub_model_id=args.push_to_hub,
    )
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        data_collator=DataCollatorWithPadding(tokenizer),
        processing_class=tokenizer,
        compute_metrics=compute_metrics,
    )
    trainer.train()

    metrics = trainer.evaluate(tokenized["test"], metric_key_prefix="test")
    metrics = {k.removeprefix("test_"): v for k, v in metrics.items() if k.startswith("test_") and k != "test_runtime"}
    metrics = {k: metrics[k] for k in ("accuracy", "precision", "recall", "f1")}

    trainer.save_model(str(output))
    tokenizer.save_pretrained(str(output))
    (output / "metrics.json").write_text(json.dumps(metrics, indent=2))
    if args.push_to_hub:
        trainer.push_to_hub()

    print(json.dumps(metrics, indent=2))
    print(f"Saved to {output}. Fake label index for the API: {LABEL2ID['FAKE']}")


if __name__ == "__main__":
    main()
