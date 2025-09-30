# FRA Atlas WebGIS MVP

Modern static front-end pages styled with Tailwind CSS coupled with a Flask-based OCR microservice. The OCR API ingests uploaded claim documents, extracts structure with Google Gemini, and persists results to SQLite.

## Project Layout

- `index.html`, `pages/`, `css/`, `js/` – static client assets
- `package.json` – Tailwind build scripts and Node server entry point
- `OCR/` – Flask OCR API (`flask_ocr_api.py`, `requirements.txt`, seed `fra_claims.db`)
- `.render.yaml` – Render multi-service configuration (Node frontend + API)

## Local Development

### Front-end

```bash
npm install
npm run build:css   # generate css/main.css from Tailwind
npm run start       # serves the static assets and proxies /api to the OCR service
```

`js/config.js` automatically points API calls to `http://localhost:5002/api` when you are on localhost. In production the Node server proxies `/api/...` to the OCR service defined by `OCR_API_URL`.

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

- **Node Web Service (`fra-atlas-frontend`)**
  - Build: `npm install && npm run build:css`
  - Start: `npm run start` (binds to Render's `$PORT` and proxies `/api/*`)
  - Environment variables:
    - `OCR_API_URL` (point to the deployed OCR API base, e.g. `https://fra-ocr-api.onrender.com`)
- **Python Web Service (`fra-ocr-api`)**
  - Build installs `tesseract-ocr`, `libtesseract-dev`, `poppler-utils`, then `pip install -r OCR/requirements.txt`
  - Start command: `cd OCR && gunicorn --bind 0.0.0.0:$PORT flask_ocr_api:app`
  - Environment variables (Render dashboard):
    - `GEMINI_API_KEY` (mark as secret)
    - Optional overrides for `DB_FILE`, `GEMINI_MODEL`, etc.

After the first deploy, set `OCR_API_URL` on the frontend service to the deployed OCR API hostname (Render usually assigns `https://fra-ocr-api.onrender.com`).

## Post-Deploy Checklist

- Hit `https://<api-domain>/api/health` and confirm `{"status": "healthy"}`
- Upload a sample PDF/image via the claims UI; ensure OCR text and extracted fields populate
- Verify claims persist between requests (SQLite file located at `/tmp/fra_claims.db` by default on Render)
- Monitor Render logs for missing OCR binaries or Gemini errors

## Housekeeping

- Commit the generated `css/main.css` after running `npm run build:css` so static hosting works without a build step
- Do not commit local virtualenvs or API keys
- Remove or rotate the default Gemini key if it was previously checked in
