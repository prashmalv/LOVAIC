FROM python:3.10-slim

WORKDIR /app

# System deps needed by Pillow/matplotlib at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Only the assets the app actually loads
COPY app.py logo.png RLAI_LOVAIC_best_model.h5 ./
COPY .streamlit ./.streamlit

EXPOSE 8501

CMD ["streamlit", "run", "app.py", \
     "--server.port=8501", \
     "--server.address=0.0.0.0", \
     "--server.headless=true", \
     "--browser.gatherUsageStats=false"]
