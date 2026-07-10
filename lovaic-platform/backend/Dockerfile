FROM python:3.10-slim

WORKDIR /app

# OpenCV + video (ffmpeg) runtime deps for detection & stream ingestion
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Model weights (yolov8n.pt, yolov8n-oiv7.pt) download lazily on first request.
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
