"""
main.py — IGI FastAPI Backend
Combined app entrypoint for the main GIA parser and mini-reports parser.
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.staticfiles import StaticFiles
import shutil
import tempfile
import uuid

from extractor import extract_data, extract_images 
# -------------------------------------------------------------------
# Base paths and output directories
# -------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
FILES_DIR = BASE_DIR / "files"
MINI_REPORTS_DIR = BASE_DIR / "mini-reports-output"
OUTPUT_ROOT = BASE_DIR / "LBD-output"

FILES_DIR.mkdir(parents=True, exist_ok=True)
MINI_REPORTS_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

# Ensure the router modules pick up the same directories when they read env vars
os.environ.setdefault("OUTPUT_DIR", str(FILES_DIR))
os.environ.setdefault("MINI_REPORTS_DIR", str(MINI_REPORTS_DIR))
os.environ.setdefault("LBD_OUTPUT_DIR", str(OUTPUT_ROOT))

# -------------------------------------------------------------------
# Routers
# -------------------------------------------------------------------
from router import router as pdf_router
from mini_reports import router as mini_reports_router

# -------------------------------------------------------------------
# App
# -------------------------------------------------------------------
app = FastAPI(title="IGI FastAPI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://vm-6ldvtqok6a1jgx2h8z3lx1ka.vusercontent.net/",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://igi.org.pe",
        "https://api.igi.org.pe",
        "https://www.igi.org.pe",
        "https://www.api.igi.org.pe",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Static files
# -------------------------------------------------------------------
app.mount("/files", StaticFiles(directory=str(FILES_DIR)), name="files")
app.mount(
    "/mini-reports",
    StaticFiles(directory=str(MINI_REPORTS_DIR)),
    name="mini-reports",
)
app.mount("/LBD-output", StaticFiles(directory=OUTPUT_ROOT), name="LBD-output")

# -------------------------------------------------------------------
# Upload size limit
# -------------------------------------------------------------------
MAX_UPLOAD_BYTES = 100 * 1024 * 1024  # 100 MB


@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH"):
        content_length = request.headers.get("content-length")

        if content_length:
            try:
                if int(content_length) > MAX_UPLOAD_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body too large. Maximum is 100 MB."},
                    )
            except ValueError:
                pass
        else:
            received = 0
            chunks: list[bytes] = []

            async for chunk in request.stream():
                received += len(chunk)
                if received > MAX_UPLOAD_BYTES:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body too large. Maximum is 100 MB."},
                    )
                chunks.append(chunk)

            body = b"".join(chunks)

            async def _receive():
                return {"type": "http.request", "body": body, "more_body": False}

            request._receive = _receive  # type: ignore[attr-defined]

    return await call_next(request)


# -------------------------------------------------------------------
# Routers
# -------------------------------------------------------------------
app.include_router(pdf_router)
app.include_router(mini_reports_router)

# -------------------------------------------------------------------
# Health check
# -------------------------------------------------------------------
@app.get("/")
def home():
    return {"message": "IGI FastAPI Backend running"}




@app.post("/extract-igi-report")
async def extract_igi_report(file: UploadFile = File(...)):
    """
    Upload an IGI 'electronic copy' diamond report PDF.

    Returns JSON:
    {
        "data": { ...parsed report fields... },
        "images": {
            "barcode": "output/<report_number>/barcode.png",
            "qr_code": "output/<report_number>/qr_code.png",
            "proportions": "output/<report_number>/proportions.png",
            "clarity_characteristics_full": "...",
            "color_clarity_chart_full": "..."
        },
        "image_urls": {
            "barcode": "/LBD-output/<report_number>/barcode.png",
            ...
        }
    }
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Save the upload to a temp path first (extraction needs a real file path)
    tmp_dir = tempfile.mkdtemp(prefix="igi_upload_")
    tmp_pdf_path = os.path.join(tmp_dir, file.filename)
    try:
        with open(tmp_pdf_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # 1. Parse the report's text fields into JSON
        data = extract_data(tmp_pdf_path)

        report_number = data.get("report_number") or f"UNKNOWN_{uuid.uuid4().hex[:8]}"
        # sanitize for use as a folder name
        safe_report_number = "".join(
            c for c in report_number if c.isalnum() or c in ("-", "_")
        ) or f"UNKNOWN_{uuid.uuid4().hex[:8]}"

        report_out_dir = os.path.join(OUTPUT_ROOT, safe_report_number)

        # 2. Extract the 5 named images into output/<report_number>/
        #    (no embedded/ folder is ever created — see igi_extractor.py)
        saved_paths = extract_images(tmp_pdf_path, report_out_dir)

        images_rel = {
            key: os.path.relpath(path, os.path.dirname(OUTPUT_ROOT))
            for key, path in saved_paths.items()
        }
        image_urls = {
            key: f"/LBD-output/{safe_report_number}/{os.path.basename(path)}"
            for key, path in saved_paths.items()
        }

        return {
            "data": data,
            "report_number": safe_report_number,
            "images": images_rel,
            "image_urls": image_urls,
        }
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

