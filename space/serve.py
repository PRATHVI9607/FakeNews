"""Hugging Face ZeroGPU entry point.

ZeroGPU starts its scheduler when a Gradio app launches and only attaches a GPU inside
@spaces.GPU calls, so this launches an empty Gradio app and routes everything to Loki's API.
"""
import os
from pathlib import Path

import spaces  # must be imported before torch

import gradio as gr
from starlette.routing import Mount

os.environ.setdefault("WEB_DIR", str(Path(__file__).parent / "static"))

from app import models  # noqa: E402
from app.main import app as api  # noqa: E402

MODELS = models.build_models()
models.load_all(MODELS)
api.state.models = MODELS
cpu_run = models.run


@spaces.GPU
def score(text: str, title: str):
    # Arguments cross a process boundary, so pass text only and use the module-level models.
    return cpu_run(MODELS, text, title)


models.run = lambda _models, text, title="": score(text, title)

demo = gr.Blocks()
demo.launch(server_name="0.0.0.0", server_port=7860, prevent_thread_lock=True)
demo.app.router.routes.insert(0, Mount("/", app=api))
demo.block_thread()
