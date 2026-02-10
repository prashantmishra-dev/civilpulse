FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Tesseract + build tools for numpy/scikit-learn
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    tesseract-ocr-hin \
    tesseract-ocr-tam \
    gcc g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-sqlite.txt .
RUN pip install --no-cache-dir -r requirements-sqlite.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
