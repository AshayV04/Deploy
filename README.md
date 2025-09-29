# FRA Atlas WebGIS MVP

Modern static front-end pages styled with Tailwind CSS coupled with a Flask-based OCR microservice. The OCR API ingests uploaded claim documents, extracts structure with Google Gemini, and persists results to SQLite.

## Project Layout

- `index.html`, `pages/`, `css/`, `js/` – static client assets
- `package.json` – Tailwind build scripts
- `OCR/` – Flask OCR API (`flask_ocr_api.py`, `requirements.txt`, seed `fra_claims.db`)
- `.render.yaml` – Render multi-service configuration (static site + API)

## Local Development

### Front-end

```bash
npm install
npm run build:css   # generate css/main.css from Tailwind
npm run start       # optional: http-server (see package.json)
```

`js/config.js` automatically points API calls to `http://localhost:5002/api` when you are on localhost. In production it expects `/api/...` to be proxied to the OCR service (handled via `.render.yaml`).

### OCR API

```bash
cd OCR
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=your_key
python flask_ocr_api.py  # listens on http://localhost:5002 by default
```

Environment options:

- `GEMINI_API_KEY` (**required**) – Google Gemini key
- `GEMINI_MODEL` (default `gemini-2.0-flash`)
- `DB_FILE` (default `OCR/fra_claims.db`)
- `TESSERACT_CMD`, `TESSDATA_PREFIX`, `POPPLER_PATH` if you need custom OCR binaries
- `PORT`, `FLASK_DEBUG` for local Flask run

## Deployment on Render

This repo ships with `.render.yaml` so you can click “New Blueprint” in Render and select the repository.

- **Static Site (`fra-atlas-frontend`)**
  - Build: `npm install && npm run build:css`
  - Publish: root directory
  - Routes:
    - `/api/*` → rewrites to the OCR service (update the hostname after the API service is created)
    - `/*` → `index.html`
- **Python Web Service (`fra-ocr-api`)**
  - Build installs `tesseract-ocr`, `libtesseract-dev`, `poppler-utils`, then `pip install -r OCR/requirements.txt`
  - Start command: `cd OCR && gunicorn --bind 0.0.0.0:$PORT flask_ocr_api:app`
  - Environment variables (Render dashboard):
    - `GEMINI_API_KEY` (mark as secret)
    - Optional overrides for `DB_FILE`, `GEMINI_MODEL`, etc.

After the first deploy, edit `.render.yaml` or the Render dashboard to point the static-site `destination` in the `/api/*` rewrite to the actual OCR service URL (Render usually assigns `https://fra-ocr-api.onrender.com`).

## Post-Deploy Checklist

- Hit `https://<api-domain>/api/health` and confirm `{"status": "healthy"}`
- Upload a sample PDF/image via the claims UI; ensure OCR text and extracted fields populate
- Verify claims persist between requests (SQLite file located at `/tmp/fra_claims.db` by default on Render)
- Monitor Render logs for missing OCR binaries or Gemini errors

## Housekeeping

- Commit the generated `css/main.css` after running `npm run build:css` so static hosting works without a build step
- Do not commit local virtualenvs or API keys
- Remove or rotate the default Gemini key if it was previously checked in

