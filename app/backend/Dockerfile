FROM python:3.12-slim

# libgomp1: OpenMP runtime required by xgboost/scikit-learn at runtime (the .pkl
#   models fail to load without it).
# fonts-dejavu-core: a Unicode TTF at /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
#   so report_service renders Romanian diacritics in PDFs; the slim image ships no
#   TTF fonts, so without it fpdf2 falls back to Helvetica (Latin-1) and crashes on
#   characters like "ă" in plan titles/content.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Normalize line endings in case the file was authored on Windows (CRLF breaks the shebang).
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

EXPOSE 8000

CMD ["./entrypoint.sh"]
