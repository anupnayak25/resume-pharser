# resume-pharser

## Backend (FastAPI)

### Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### Run

Run from `backend/`:

```bash
cd backend
uvicorn app:app --reload --port 8000
```

### Notes

- OCR for image resumes supports two engines:
	- Preferred: Tesseract (`pytesseract`) for best quality
	- Fallback: `rapidocr-onnxruntime` (works without system Tesseract)
- If Tesseract is not installed, image OCR will still try fallback automatically.
- Storage uses MongoDB.
	- Start a local MongoDB quickly (Docker): `docker run --rm -p 27017:27017 --name resume-pharser-mongo mongo:7`
	- Configure via env vars:
		- `MONGO_URI` (default `mongodb://localhost:27017`)
		- `MONGO_DB_NAME` (default `resume_pharser`)