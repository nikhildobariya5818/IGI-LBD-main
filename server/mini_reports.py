"""
pdf/mini_reports.py — Small/mini GIA report PDF parser

Fixes applied vs previous version:
  - [Issue #5  FIX] PDF files are now processed concurrently via
                    asyncio.gather() instead of sequentially in a for-loop.

                    Old code:
                        for pdf in files:
                            result = await run_in_threadpool(parse_gia_report_from_bytes, ...)
                            results.append(result)
                    Each PDF (2–5 s of CPU) was awaited to completion before
                    the next started. Total time for 2 PDFs = 4–10 s, holding
                    a thread-pool thread the whole time.

                    New code uses asyncio.gather() to dispatch both PDFs to
                    the thread pool simultaneously. Total time = max(t1, t2)
                    instead of t1 + t2. On a single-vCPU machine the wall
                    time won't halve (the GIL and OS scheduler still serialize
                    Python bytecode), but the event loop stays responsive and
                    I/O-bound phases (fitz reading, file writes) do overlap.

  - [Issue #6  FIX] darken_reds_and_greens-equivalent operations (white
                    background removal) kept minimal — no heavy HSV math in
                    this module.

Retained from previous fix:
  - [Issue #1]  parse_gia_report_from_bytes() offloaded via run_in_threadpool
  - [Issue #4]  Per-report isolated output subdirectory
  - [Issue #11] 50 MB per-file cap
"""

import asyncio
import os
import io
import re
import fitz
import qrcode
import random
import barcode
from barcode.writer import ImageWriter
from PIL import Image
import numpy as np
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from fastapi.concurrency import run_in_threadpool

router = APIRouter(
    prefix="/pdf",
    tags=["PDF Processing"],
)

OUTPUT_DIR = os.getenv("MINI_REPORTS_DIR", "mini-reports-output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

MAX_PDF_BYTES = 50 * 1024 * 1024


def path_to_url(file_path: str) -> str:
    if not file_path:
        return ""
    url_path = file_path.replace("\\", "/")
    if "mini-reports-output" in url_path:
        return f"/mini-reports/{url_path.split('mini-reports-output/')[-1]}"
    return f"/{url_path}"


def _report_dir(report_number: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_\-]", "_", report_number.strip())
    path = os.path.join(OUTPUT_DIR, safe)
    os.makedirs(path, exist_ok=True)
    return path


# ==========================================================
# Upload endpoint
# [Issue #5 FIX] asyncio.gather() — both PDFs dispatched to the
#                thread pool concurrently instead of sequentially.
# ==========================================================
@router.post("/small-reports")
async def upload_pdf(files: list[UploadFile] = File(...)):
    try:
        if not (1 <= len(files) <= 2):
            return {
                "success": False,
                "error": "You can upload minimum 1 and maximum 2 PDF files",
            }

        async def _read_and_process(pdf: UploadFile) -> dict:
            """Validate, read, and process one PDF file."""
            if pdf.content_type != "application/pdf":
                raise ValueError(f"{pdf.filename} is not a valid PDF")
            pdf_bytes = await pdf.read()
            if len(pdf_bytes) > MAX_PDF_BYTES:
                raise ValueError(f"{pdf.filename} is too large. Maximum 50 MB per file.")
            # Offload CPU-bound parsing to the thread pool
            return await run_in_threadpool(parse_gia_report_from_bytes, pdf_bytes, pdf.filename)

        # [Issue #5 FIX] Dispatch all files concurrently — not sequentially
        results = await asyncio.gather(*[_read_and_process(pdf) for pdf in files], return_exceptions=False)
        return {
            "success": True,
            "count": len(results),
            "reports": list(results),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


# ==========================================================
# Core PDF parser — plain function (not async), called via
# run_in_threadpool so it never blocks the event loop.
# ==========================================================
def parse_gia_report_from_bytes(pdf_bytes: bytes, filename: str):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()

    parsed_data = _parse_text_to_json(text)
    report_number = parsed_data.get("ReportNumber") or os.path.splitext(filename)[0]

    report_folder = _report_dir(report_number)

    proportions_path = _extract_diamond_image_advanced(doc, report_folder)
    qr_path = _create_and_save_qr_code(report_number, report_folder)
    barcode10_number, barcode10_path = _generate_unique_barcode(
        digits=10, save_path_no_ext=os.path.join(report_folder, "barcode10")
    )
    barcode12_number, barcode12_path = _generate_unique_barcode(
        digits=12, save_path_no_ext=os.path.join(report_folder, "barcode12")
    )

    parsed_data["Images"] = {
        "Proportions": path_to_url(proportions_path),
        "QRCode": path_to_url(qr_path),
        "Barcode10": {"number": barcode10_number, "image": path_to_url(barcode10_path)},
        "Barcode12": {"number": barcode12_number, "image": path_to_url(barcode12_path)},
    }

    doc.close()
    return parsed_data


def _parse_text_to_json(text: str):
    def search(pattern, default=""):
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else default

    clarity_char = search(
        r"Clarity\s+Characteristics\s*[.:\s]*([A-Za-z\s,]+?)(?=\n|$)"
    )
    report_date = search(r"(\w+\s+\d{1,2},\s+\d{4})")
    report_number = search(r"GIA\s+Report\s+Number\s*[.:\s]*(\d{7,})")
    shape = search(
        r"Shape\s+and\s+Cutting\s+Style\s*[.:\s]*([A-Za-z\s]+?)(?=\n|$)"
    ) or search(r"([A-Za-z\s]+?Brilliant)")
    measurements = search(
        r"Measurements\s*[.:\s]*([\d\.\s\-]+x\s*[\d\.\s]+mm)"
    )
    carat_weight = search(r"Carat\s+Weight\s*[.:\s]*([\d\.]+\s*carat)")
    color_grade = search(r"Color\s+Grade\s*[.:\s]*([A-Z])")
    clarity_grade = search(
        r"Clarity\s+Grade\s*[.:\s]*"
        r"(Flawless|Internally\s+Flawless|VVS1|VVS2|VS1|VS2|SI1|SI2|I1|I2|I3)"
    )
    cut_grade = search(r"Cut\s+Grade\s*[.:\s]*(Excellent|Very Good|Good|Fair|Poor)")
    polish = search(r"Polish\s*[.:\s]*([A-Za-z\s]+?)(?=\n|$)")
    symmetry = search(r"Symmetry\s*[.:\s]*([A-Za-z\s]+?)(?=\n|$)")
    fluorescence = search(r"Fluorescence\s*[.:\s]*([A-Za-z\s]+?)(?=\n|$)")

    return {
        "ReportNumber": report_number,
        "ReportDate": report_date,
        "GIANATURALDIAMONDGRADINGREPORT": {
            "GIAReportNumber": report_number,
            "ShapeandCuttingStyle": shape,
            "Measurements": measurements,
        },
        "GRADINGRESULTS": {
            "CaratWeight": carat_weight,
            "ColorGrade": color_grade,
            "ClarityGrade": clarity_grade,
            "CutGrade": cut_grade,
        },
        "ADDITIONALGRADINGINFORMATION": {
            "Polish": polish,
            "Symmetry": symmetry,
            "Fluorescence": fluorescence,
            "ClarityCharacteristics": clarity_char,
        },
        "Images": {},
    }


def _extract_diamond_image_advanced(doc, save_folder: str) -> str:
    save_path = os.path.join(save_folder, "proportions.png")
    for page in doc:
        boxes = page.search_for("PROPORTIONS")
        if not boxes:
            continue
        rect = boxes[0]
        crop = fitz.Rect(
            rect.x0 - 8, rect.y1 + 2, rect.x0 + 108, rect.y1 + 80
        )
        pix = page.get_pixmap(clip=crop, dpi=300)
        pix.save(save_path)
        remove_white_background_fast(save_path)
        return save_path
    return ""


def _create_and_save_qr_code(report_number: str, folder: str) -> str:
    url = f"https://www.gia.edu/report-check?reportno={report_number}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGBA")
    arr = np.array(img)
    white_mask = (arr[..., 0] > 240) & (arr[..., 1] > 240) & (arr[..., 2] > 240)
    arr[..., 3] = np.where(white_mask, 0, 255)
    img = Image.fromarray(arr, "RGBA")
    path = os.path.join(folder, "qrcode.png")
    img.save(path)
    return path


def _generate_unique_barcode(digits: int, save_path_no_ext: str):
    barcode_number = "1" + "".join(
        str(random.randint(0, 9)) for _ in range(digits - 1)
    )
    padded = f"    {barcode_number}    "
    code = barcode.get("code128", padded, writer=ImageWriter())
    options = {
        "write_text": False,
        "module_width": 3.0 if digits == 10 else 3.8,
        "module_height": 50.0 if digits == 10 else 75.0,
        "quiet_zone": 15.0,
        "font_size": 0,
    }
    filename = code.save(save_path_no_ext, options=options)
    remove_white_background_fast(filename)
    return barcode_number, filename


def remove_white_background_fast(image_path: str):
    """Remove white background in-place. Single NumPy array operation."""
    img = Image.open(image_path).convert("RGBA")
    arr = np.array(img)
    white_mask = (arr[..., 0] > 245) & (arr[..., 1] > 245) & (arr[..., 2] > 245)
    arr[..., 3] = np.where(white_mask, 0, arr[..., 3])
    Image.fromarray(arr, "RGBA").save(image_path)
