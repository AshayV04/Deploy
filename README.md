# FRA Atlas WebGIS MVP

Modern static front-end pages styled with Tailwind CSS coupled with a Flask-based OCR microservice. The OCR API ingests uploaded claim documents, extracts structure with Google Gemini, and persists results to SQLite.

## Project Layout

- `index.html`, `pages/`, `css/`, `js/` – static client assets
- `package.json` – Tailwind build scripts and Node server entry point
- `OCR/` – Flask OCR API (`flask_ocr_api.py`, `requirements.txt`, seed `fra_claims.db`)
- `render.yaml` – Render multi-service configuration (Node frontend + API)

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

- `GEMINI_API_KEY` (optional) – Google Gemini key; without it the API falls back to regex extraction only
- `GEMINI_MODEL` (default `gemini-2.0-flash`)
- `DB_FILE` (default `OCR/fra_claims.db`)
- `TESSERACT_CMD`, `TESSDATA_PREFIX`, `POPPLER_PATH` if you need custom OCR binaries
- `PORT`, `FLASK_DEBUG` for local Flask run

## Deployment on Render

The repository ships with `render.yaml`, so you can click **New Blueprint** in Render, point to this repo, and provision both services on the free plan.

1. Create a Blueprint from `render.yaml`. Render detects two web services (`fra-atlas-frontend` and `fra-ocr-api`). Keep the default free plan when prompted.
2. Before deploying, add environment variables:
   - Frontend: `OCR_API_URL` (leave blank until the API URL is known).
   - API: optionally set `GEMINI_API_KEY` if you want Gemini-assisted extraction; otherwise the service automatically falls back to regex parsing. You can also override `GEMINI_MODEL`, `DB_FILE`, etc.
3. Kick off the first deploy. The API's health check is `/api/health`; the frontend uses `/`.
4. After the API finishes deploying, copy its public URL (e.g. `https://fra-ocr-api.onrender.com`) and set it as `OCR_API_URL` on the frontend service, then redeploy the frontend.

Both services build successfully in the Render free tier. The OCR API installs Tesseract and Poppler during the build step and runs under Gunicorn; the frontend serves the static bundle with `http-server` and proxies `/api/*` calls to the Render-hosted OCR API.

## Post-Deploy Checklist

- Hit `https://<api-domain>/api/health` and confirm `{"status": "healthy"}`
- Upload a sample PDF/image via the claims UI; ensure OCR text and extracted fields populate
- Verify claims persist between requests (SQLite file located at `/tmp/fra_claims.db` by default on Render)
- Monitor Render logs for missing OCR binaries or Gemini errors

## Housekeeping

- Commit the generated `css/main.css` after running `npm run build:css` so static hosting works without a build step
- Do not commit local virtualenvs or API keys
- Remove or rotate the default Gemini key if it was previously checked in
