from __future__ import annotations

from typing import Optional

from fastapi import HTTPException

from services.text_utils import clean_text


def get_extension(filename: str) -> str:
    parts = filename.rsplit(".", 1)
    return parts[-1].lower() if len(parts) == 2 else ""


def extract_text_from_pdf(data: bytes) -> str:
    try:
        import fitz  # PyMuPDF
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PyMuPDF not installed or failed to import: {e}")

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        parts = [page.get_text("text") for page in doc]
    finally:
        doc.close()
    return "\n".join(parts)


def extract_text_from_docx(data: bytes) -> str:
    try:
        import docx  # python-docx
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"python-docx not installed or failed to import: {e}")

    import io

    f = io.BytesIO(data)
    document = docx.Document(f)
    return "\n".join([p.text for p in document.paragraphs if p.text])


def extract_text_from_image(data: bytes) -> str:
    import io
    first_error: str | None = None

    def _preprocessed_images():
        from PIL import Image, ImageEnhance, ImageOps

        base = Image.open(io.BytesIO(data)).convert("RGB")
        gray = ImageOps.grayscale(base)
        contrast = ImageEnhance.Contrast(gray).enhance(2.2)
        # Upscale to improve OCR on compressed screenshots.
        upscaled = contrast.resize((contrast.width * 2, contrast.height * 2))
        return [base, gray, contrast, upscaled]

    try:
        import pytesseract
        for image in _preprocessed_images():
            text = pytesseract.image_to_string(image)
            if text and text.strip():
                return text
    except Exception as e:
        first_error = f"pytesseract failed: {e}"

    try:
        import numpy as np
        from rapidocr_onnxruntime import RapidOCR

        ocr = RapidOCR()
        for image in _preprocessed_images():
            arr = np.array(image)
            result, _ = ocr(arr)
            if not result:
                continue

            lines: list[str] = []
            for row in result:
                if not isinstance(row, (list, tuple)):
                    continue
                txt = ""
                if len(row) >= 3 and isinstance(row[1], str):
                    txt = row[1]
                elif len(row) >= 2:
                    txt = str(row[1])
                txt = txt.strip()
                if txt:
                    lines.append(txt)

            merged = "\n".join(lines).strip()
            if merged:
                return merged
        return ""
    except Exception as e:
        extra = f"; fallback rapidocr failed: {e}"
        hint = (
            " Install OS packages: tesseract-ocr libgl1 libglib2.0-0 "
            "(Ubuntu/Debian: sudo apt-get update && sudo apt-get install -y tesseract-ocr libgl1 libglib2.0-0)."
        )
        detail = (first_error or "Image OCR failed") + extra
        detail += hint
        raise HTTPException(status_code=500, detail=detail)


def extract_text_from_txt(data: bytes) -> str:
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(enc)
        except Exception:
            continue
    return data.decode("utf-8", errors="ignore")


def extract_text_for_file(filename: str, content_type: Optional[str], data: bytes) -> str:
    ext = get_extension(filename)
    ct = (content_type or "").lower()

    if ext == "pdf" or ct == "application/pdf":
        return extract_text_from_pdf(data)
    if ext in {"docx"} or ct in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    }:
        return extract_text_from_docx(data)
    if ext in {"png", "jpg", "jpeg", "webp", "tif", "tiff", "bmp"} or ct.startswith("image/"):
        return extract_text_from_image(data)
    if ext in {"txt"} or ct.startswith("text/"):
        return extract_text_from_txt(data)

    raise HTTPException(status_code=415, detail=f"Unsupported file type for {filename}")


def extract_and_clean_text(filename: str, content_type: Optional[str], data: bytes) -> str:
    return clean_text(extract_text_for_file(filename, content_type, data))
