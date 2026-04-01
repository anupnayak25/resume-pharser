from __future__ import annotations

from typing import Optional

from fastapi import HTTPException

from backend.services.text_utils import clean_text


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
    try:
        import pytesseract
        from PIL import Image
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR dependencies missing (pytesseract/Pillow): {e}")

    import io

    image = Image.open(io.BytesIO(data))
    return pytesseract.image_to_string(image)


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
