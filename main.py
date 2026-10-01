import os

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import fitz

# Reuse the extraction pipeline from igi_extractor.py instead of
# duplicating watermark-removal logic here. Its panel pipeline renders
# page2/page3 straight from PDF vector data (PyMuPDF) with a looser,
# noise-tolerant gray threshold and protect_boxes around embedded
# photos, which avoids the speckled white-dot artifacts that the old
# pdf2image + GRAY_TOLERANCE=2 approach produced.
from server.extractor import extract_panel_images, DPI

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "output"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Serve generated panel images so the frontend can render them.
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")

BASE_URL = "http://localhost:8000"

# --------------------------------------------------------------------
# Footer/header text to redact from the PDF *before* rasterizing, e.g.
# titles and copyright lines that aren't already handled by the panel
# pipeline's own dynamic footer redaction.
# --------------------------------------------------------------------
REDACT_KEYWORDS = [
    "LABORATORY GROWN DIAMOND REPORT",
    "DIAMOND REPORT",
    "INTERNATIONAL GEMOLOGICAL",
    "GEMOLOGICAL INSTITUTE",
    "ELECTRONIC COPY",
    "© IGI",
    "FD -",
    "FD-",
    "© IGI 2020 International Gemological Institute",
    "FD - 10 20",
]


def redact_pdf_text(pdf_path):
    try:
        doc = fitz.open(pdf_path)

        for page in doc:
            text_dict = page.get_text("dict")

            for block in text_dict["blocks"]:
                if "lines" not in block:
                    continue

                for line in block["lines"]:
                    line_text = " ".join(span["text"] for span in line["spans"]).strip()
                    upper = line_text.upper()

                    if any(keyword in upper for keyword in REDACT_KEYWORDS):
                        rect = fitz.Rect(line["bbox"])
                        padding = 2  # points
                        rect = fitz.Rect(
                            rect.x0 - padding,
                            rect.y0 - padding,
                            rect.x1 + padding,
                            rect.y1 + padding,
                        )
                        page.add_redact_annot(rect, fill=(1, 1, 1))

            page.apply_redactions()

        temp = pdf_path.replace(".pdf", "_redacted.pdf")
        doc.save(temp)
        doc.close()

        os.replace(temp, pdf_path)

    except Exception as e:
        print(e)
        raise


@app.post("/extract-igi-report")
async def extract_images(file: UploadFile = File(...)):
    pdf_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(pdf_path, "wb") as f:
        f.write(await file.read())

    # Remove copyright/footer/header text at the PDF level first.
    redact_pdf_text(pdf_path)

    # Get page dimensions for the response payload.
    doc = fitz.open(pdf_path)
    if len(doc) == 0:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "No pages found."},
        )
    width_pt = doc[0].rect.width
    height_pt = doc[0].rect.height
    doc.close()

    # Panel extraction: reuses igi_extractor's clean watermark removal
    # (no white-dot artifacts) instead of the old inline pipeline.
    saved_paths = extract_panel_images(pdf_path, OUTPUT_DIR, dpi=DPI)

    if not saved_paths:
        return JSONResponse(
            status_code=400,
            content={"success": False, "message": "Panel extraction failed."},
        )

    images = {
        key: f"{BASE_URL}/output/{os.path.basename(path)}"
        for key, path in saved_paths.items()
    }

    return JSONResponse(
        {
            "success": True,
            "page_width": width_pt * (DPI / 72),
            "page_height": height_pt * (DPI / 72),
            "images": images,
        }
    )