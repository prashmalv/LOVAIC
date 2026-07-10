"""
Fine-tune a custom LOVAIC detection model (e.g. plastic-waste or PPE).

This is the honest path to production-grade accuracy: bring a labelled dataset
in YOLO format, run this once, then point the platform at the result via:

    export LOVAIC_MODEL_CUSTOM=/path/to/runs/detect/lovaic-custom/weights/best.pt

Where to get data (free, YOLO-exportable):
  • Plastic / litter:  TACO (tacodataset.org), or Roboflow Universe "plastic waste"
  • PPE / helmet:      Roboflow Universe "hard hat / PPE" datasets
Export as "YOLOv8" and point --data at the downloaded data.yaml.

Usage:
    ./venv/bin/python train_custom.py --data datasets/plastic_ppe.example.yaml \
        --base yolov8n.pt --epochs 50 --imgsz 640 --name lovaic-custom

Training is compute-heavy — a GPU is strongly recommended (CPU works but is slow).
"""
from __future__ import annotations

import argparse


def main() -> None:
    ap = argparse.ArgumentParser(description="Fine-tune a custom LOVAIC YOLO model")
    ap.add_argument("--data", required=True, help="path to dataset data.yaml (YOLO format)")
    ap.add_argument("--base", default="yolov8n.pt", help="base weights to fine-tune from")
    ap.add_argument("--epochs", type=int, default=50)
    ap.add_argument("--imgsz", type=int, default=640)
    ap.add_argument("--batch", type=int, default=16)
    ap.add_argument("--name", default="lovaic-custom", help="run name under runs/detect/")
    ap.add_argument("--device", default=None, help="'0' for GPU, 'cpu' to force CPU")
    args = ap.parse_args()

    from ultralytics import YOLO

    model = YOLO(args.base)
    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        name=args.name,
        device=args.device,
    )

    best = getattr(results, "save_dir", "runs/detect/" + args.name)
    print("\n" + "=" * 64)
    print("Training complete. Plug the model into LOVAIC with:")
    print(f"  export LOVAIC_MODEL_CUSTOM={best}/weights/best.pt")
    print("Then restart the backend — garbage & PPE modes will use it.")
    print("=" * 64)


if __name__ == "__main__":
    main()
