"""
LOVAIC SLM — sovereign vision-language model (built on SmolVLM, Apache-2.0).

Two deployable tiers, same code:
  • lite → SmolVLM-500M  (CPU / edge / mobile-class hardware)
  • pro  → SmolVLM-2B    (GPU, higher-fidelity reasoning)

On-demand scene understanding / VQA that complements YOLO's structured
detection: it reasons about a frame in natural language (crowd behaviour,
hazards, PPE, litter, signage/OCR, free-form questions). Everything runs
on-prem — the pitch: your footage + your model, fine-tunable, never leaves.
"""
from __future__ import annotations

import io
import os
import threading
from typing import Any

MODEL_IDS = {
    "lite": os.getenv("LOVAIC_SLM_LITE", "HuggingFaceTB/SmolVLM-500M-Instruct"),
    "pro": os.getenv("LOVAIC_SLM_PRO", "HuggingFaceTB/SmolVLM-Instruct"),  # ~2B
}

# Per-vertical default prompts (the user can override with their own question).
PROMPTS = {
    "safety": "You are a public-safety analyst. Describe the scene, estimate how crowded it is, flag any stampede or crowd-crush risk, and list any safety hazards you see.",
    "garbage": "Describe any garbage, litter or plastic waste visible in this scene and suggest a specific waste-management action.",
    "traffic": "Describe the traffic in this scene: vehicles, pedestrians, congestion level and any issues a traffic operator should know.",
    "queue": "Describe the queue or gathering of people and estimate the waiting situation.",
    "retail": "Describe shopper activity in this retail scene and note anything useful for store operations.",
    "ppe": "Inspect this industrial/site scene: are people wearing safety helmets and PPE? Flag anyone who appears non-compliant.",
    "general": "Describe this scene in detail, including people, objects and anything notable.",
}

_MODELS: dict[str, Any] = {}
_LOCK = threading.Lock()


def _load(tier: str):
    mid = MODEL_IDS.get(tier, MODEL_IDS["lite"])
    if mid not in _MODELS:
        with _LOCK:
            if mid not in _MODELS:
                import torch
                from transformers import AutoModelForVision2Seq, AutoProcessor

                proc = AutoProcessor.from_pretrained(mid)
                model = AutoModelForVision2Seq.from_pretrained(mid, torch_dtype=torch.float32)
                model.eval()
                _MODELS[mid] = (proc, model)
    return _MODELS[mid]


def analyze(image_bytes: bytes, prompt: str, tier: str = "lite",
            max_new_tokens: int = 220) -> str:
    import torch
    from PIL import Image

    proc, model = _load(tier)
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    msgs = [{"role": "user", "content": [{"type": "image"}, {"type": "text", "text": prompt}]}]
    text = proc.apply_chat_template(msgs, add_generation_prompt=True)
    inputs = proc(text=text, images=[img], return_tensors="pt")
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=max_new_tokens)
    decoded = proc.batch_decode(out, skip_special_tokens=True)[0]
    return decoded.split("Assistant:")[-1].strip()
