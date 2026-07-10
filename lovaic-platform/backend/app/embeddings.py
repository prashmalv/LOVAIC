"""
Lightweight image embeddings for the Lost & Found visual search.

We reuse a pretrained ResNet18 (ships with torchvision, already a transitive
dependency of ultralytics) as a 512-d feature extractor and match with cosine
similarity. This gives a genuine "search by photo" experience without training
anything custom.
"""
from __future__ import annotations

import io

import numpy as np
from PIL import Image

_MODEL = None
_PREPROCESS = None


def _load():
    global _MODEL, _PREPROCESS
    if _MODEL is None:
        import torch
        import torchvision.transforms as T
        from torchvision.models import ResNet18_Weights, resnet18

        weights = ResNet18_Weights.DEFAULT
        net = resnet18(weights=weights)
        net.fc = torch.nn.Identity()  # drop classifier -> 512-d embedding
        net.eval()
        _MODEL = net
        _PREPROCESS = weights.transforms()
    return _MODEL, _PREPROCESS


def embed(raw: bytes) -> list[float]:
    import torch

    net, preprocess = _load()
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    tensor = preprocess(img).unsqueeze(0)
    with torch.no_grad():
        feat = net(tensor).squeeze(0).numpy()
    norm = np.linalg.norm(feat) + 1e-8
    return (feat / norm).astype("float32").tolist()


def cosine(a: list[float], b: list[float]) -> float:
    va, vb = np.asarray(a, dtype="float32"), np.asarray(b, dtype="float32")
    return float(np.dot(va, vb))  # already L2-normalized
