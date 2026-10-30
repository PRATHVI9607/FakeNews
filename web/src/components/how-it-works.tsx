const STEPS = [
  { title: "Extract", body: "For a URL, the article title, authors, date and body text are pulled from the page. Pasted text skips this step." },
  { title: "Score", body: "Four fine-tuned transformer models from the Hugging Face Hub each estimate the probability that the text is fake." },
  { title: "Average", body: "The four probabilities are averaged. Above 50% reads as fake; confidence is the distance from that line." },
  { title: "Cross-check", body: "In parallel, the domain is looked up in two lists of known fake-news sources and scanned with VirusTotal." },
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how" className="border-t border-ink pt-4">
      <h2 id="how" className="label !text-ink">How it works</h2>
      <ol className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t border-rule pt-4">
            <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-3 font-serif text-3xl leading-none">{s.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
