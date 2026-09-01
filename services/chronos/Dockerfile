FROM python:3.12-slim

# LightGBM requires libgomp
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY api.py features.py physics_engine.py train_models.py data_streamer.py ./
COPY shared/ ./shared/
COPY models/ ./models/
COPY scripts/ ./scripts/

EXPOSE 8000
ENV PORT=8000
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
