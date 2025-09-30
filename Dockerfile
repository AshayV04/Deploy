# Use official Python 3.13 image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Install system dependencies for OCR and Pillow
RUN apt-get update && apt-get install -y \
    tesseract-ocr libtesseract-dev poppler-utils \
    libjpeg-dev zlib1g-dev libtiff-dev libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend source code
COPY OCR/ ./OCR/

# Copy requirements and install Python dependencies
COPY OCR/requirements.txt ./
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Expose the port your app will run on
EXPOSE 8000

# Set environment variables required (if any)
ENV GEMINI_API_KEY="" \
    GEMINI_MODEL="gemini-2.0-flash" \
    DB_FILE="/tmp/fra_claims.db" \
    PORT=8000

# Start the gunicorn server to run your app
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "flask_ocr_api:app", "-w", "4"]
