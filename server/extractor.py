"""
igi_extractor.py

Core logic for extracting data + images from IGI diamond report PDFs
(the 4-panel "electronic copy" layout).

Entry points:

  extract_images(pdf_path, out_dir, n_columns=4) -> dict[str, str]
      Same heuristics as the original extract_igi_images.py script, EXCEPT
      the "embedded/*.png" dump of every other raster image has been
      removed entirely (no embedded folder is created, no extra images
      are saved). Returns a dict mapping image name -> saved file path.

  extract_panel_images(pdf_path, out_dir, dpi=300) -> dict[str, str]
      Rasterizes page 1 of the PDF at high DPI, strips the repeating
      "IGI" watermark, whites out the fixed logo/seal/note-box regions,
      then splits the page into 4 vertical panels (page1..page4) as
      whole-page-crop PNGs. This is a different, coarser extraction
      strategy than extract_images() (which crops precise per-field
      regions) -- it's useful when the consumer wants full visual
      panels of the report layout rather than individual named assets.

  extract_data(pdf_path, n_columns=4) -> dict
      Parses the report's text fields (report number, description, shape,
      measurements, grading results, additional grading info, comments,
      depth/table/girdle/culet, angles, light performance grade if
      present, etc.) into a plain JSON-serializable dict.
"""

import os
import re
import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageDraw

try:
    from pdf2image import convert_from_path
except ImportError:  # pragma: no cover - optional dependency for panel extraction
    convert_from_path = None


ZOOM = 4  # render scale -> ~288 dpi, sharp output
WHITE_THRESHOLD = 245  # pixels with R,G,B >= this are treated as background


# --------------------------------------------------------------------------
# Shared helpers
# --------------------------------------------------------------------------

def render_clip(page, rect, zoom=ZOOM):
    mat = fitz.Matrix(zoom, zoom)
    return page.get_pixmap(matrix=mat, clip=rect)


def remove_white_background(png_path, threshold=WHITE_THRESHOLD, protect_boxes=None):
    """
    Make near-white pixels transparent, in place.

    `protect_boxes` is an optional list of (x0, y0, x1, y1) pixel-space
    boxes (in the OUTPUT image's own pixel coordinates) that are excluded
    from the white-removal mask entirely -- used to shield embedded
    photos. A photo (e.g. the diamond girdle/inscription "Sample Image
    Used" shot) is a continuous-tone image that often contains bright
    highlight pixels at or above the white threshold; running the same
    blanket threshold over it punches transparent holes into the middle
    of the photo. Protecting its bounding box keeps it fully intact while
    everything else (the actual white page background) still gets
    cleaned up normally.
    """
    img = Image.open(png_path).convert("RGBA")
    arr = np.array(img)
    r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
    white_mask = (r >= threshold) & (g >= threshold) & (b >= threshold)
    if protect_boxes:
        h, w = white_mask.shape
        for (x0, y0, x1, y1) in protect_boxes:
            x0, y0 = max(0, int(x0)), max(0, int(y0))
            x1, y1 = min(w, int(x1)), min(h, int(y1))
            if x1 > x0 and y1 > y0:
                white_mask[y0:y1, x0:x1] = False
    arr[:, :, 3] = np.where(white_mask, 0, a)
    Image.fromarray(arr).save(png_path)


def trim_transparent_image(path, padding=12):
    img = Image.open(path).convert("RGBA")
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return
    l, t, r, b = bbox
    l = max(0, l - padding)
    t = max(0, t - padding)
    r = min(img.width, r + padding)
    b = min(img.height, b + padding)
    img.crop((l, t, r, b)).save(path)


def find_heading(page, text):
    hits = page.search_for(text)
    return hits[0] if hits else None


def find_heading_in_bounds(page, text, bounds):
    for h in page.search_for(text):
        inter = h & bounds
        if inter.width * inter.height > 0.5 * h.width * h.height:
            return h
    return None


def column_rect(page, col_index, n_columns, y0=0, y1=None):
    col_width = page.rect.width / n_columns
    x0 = col_width * col_index
    x1 = col_width * (col_index + 1)
    if y1 is None:
        y1 = page.rect.height
    return fitz.Rect(x0, y0, x1, y1)


def find_barcode_xref(page, bounds=None):
    best_xref = None
    best_ratio = 0
    for img in page.get_images(full=True):
        xref, w, h = img[0], img[2], img[3]
        if h == 0:
            continue
        ratio = w / h
        if ratio < 5:
            continue
        for r in page.get_image_rects(xref):
            if r.width == 0 or r.height == 0:
                continue
            if bounds is not None:
                overlap = r & bounds
                overlap_frac = (overlap.width * overlap.height) / (r.width * r.height)
                if overlap_frac < 0.6:
                    continue
            if ratio > best_ratio:
                best_ratio = ratio
                best_xref = xref
    return best_xref


def find_square_rect(page, bounds=None, min_size=40, max_size=100, tol=5):
    best = None
    for img in page.get_images(full=True):
        xref, w, h = img[0], img[2], img[3]
        if h == 0:
            continue
        if abs(w - h) > tol:
            continue
        for r in page.get_image_rects(xref):
            if r.width == 0:
                continue
            if not (min_size <= r.width <= max_size):
                continue
            if bounds is not None:
                overlap = r & bounds
                overlap_frac = (overlap.width * overlap.height) / (r.width * r.height)
                if overlap_frac < 0.6:
                    continue
            if best is None or r.y0 < best.y0:
                best = r
    return best


def _is_laboratory_grown_page(page):
    """
    True if this report's Description is a LABORATORY GROWN DIAMOND
    rather than a NATURAL DIAMOND. Mirrors the same substring check
    extract_data() uses for its is_laboratory_grown flag, but works
    directly off the raw page text so extract_images() (which doesn't
    otherwise parse fields) can use it too.
    """
    text = page.get_text("text").upper()
    return "LABORATORY GROWN" in text


def find_watermark_xref(page, bounds, min_height=150, ratio_lo=1.1, ratio_hi=1.6):
    for img in page.get_images(full=True):
        xref, w, h = img[0], img[2], img[3]
        if h == 0 or w == 0:
            continue
        ratio = h / w
        if not (ratio_lo <= ratio <= ratio_hi):
            continue
        for r in page.get_image_rects(xref):
            if r.height < min_height:
                continue
            if bounds is not None:
                overlap = r & bounds
                overlap_frac = (overlap.width * overlap.height) / (r.width * r.height)
                if overlap_frac < 0.6:
                    continue
            return xref
    return None


def _pixmap_as_rgb_array(doc, xref):
    """Load an xref's pixel data as an (h, w, 3) uint8 RGB array."""
    pix = fitz.Pixmap(doc, xref)
    if pix.n - pix.alpha >= 4:
        pix = fitz.Pixmap(fitz.csRGB, pix)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
    return arr[:, :, :3]


def _looks_like_qr_content(rgb):
    """
    Content-based QR test, used for candidates that pass the square-image
    shape test but fall outside the small legacy native-size window.

    A rendered QR module grid is essentially grayscale (R==G==B per pixel)
    with a substantial fraction of dark "module" pixels -- unlike the
    IGI seal/logo artwork (tan/brown, R>G>B, almost no true-black pixels)
    or a mostly-white/near-empty square crop.
    """
    rgb16 = rgb.astype(np.int16)
    grayish = (
        (np.abs(rgb16[:, :, 0] - rgb16[:, :, 1]) < 10)
        & (np.abs(rgb16[:, :, 1] - rgb16[:, :, 2]) < 10)
    )
    if grayish.mean() < 0.9:
        return False
    dark = rgb16.mean(axis=2) < 100
    dark_frac = float(dark.mean())
    return 0.15 < dark_frac < 0.7


def find_qr_xref(page, small_min=20, small_max=80, large_min=120, large_max=900, tol=3):
    """
    Locate the QR code raster.

    Different IGI report batches export the QR code at very different
    native pixel resolutions -- some as a small ~20-80px square, others
    (seen e.g. in newer "Laboratory Grown" report layouts) as a much
    larger ~300px+ square. A fixed small size window silently misses the
    latter, so this now runs a two-tier search:

      1. Legacy fast path: any square image whose native size sits in
         the small [small_min, small_max] window is returned immediately,
         same as before.
      2. Fallback: square images in a wider [large_min, large_max]
         window are only accepted if their actual pixel content looks
         like a QR code (see _looks_like_qr_content), so this doesn't
         accidentally grab the (also square) IGI seal/logo artwork.
    """
    candidates = []
    for img in page.get_images(full=True):
        xref, w, h = img[0], img[2], img[3]
        if w == 0 or h == 0 or abs(w - h) > tol:
            continue
        if not page.get_image_rects(xref):
            continue
        candidates.append((xref, w, h))

    for xref, w, h in candidates:
        if small_min <= w <= small_max:
            return xref

    doc = page.parent
    for xref, w, h in candidates:
        if not (large_min <= w <= large_max):
            continue
        try:
            rgb = _pixmap_as_rgb_array(doc, xref)
        except Exception:
            continue
        if _looks_like_qr_content(rgb):
            return xref

    return None


def find_photo_rects(page, bounds, ratio_lo=1.15, ratio_hi=1.8, min_width=60):
    """
    Heuristic: the "Sample Image Used" diamond photo is a landscape-oriented
    continuous-tone raster image (roughly 4:3 or similar), unlike the QR
    code/seal (square) or the tall watermark (portrait). Different report
    layouts place it at different sizes/columns, so this returns ALL
    matching placed rects within `bounds` -- these get passed to
    remove_white_background() as protected boxes so the photo's own
    bright/white pixels never get punched into holes.
    """
    rects = []
    for img in page.get_images(full=True):
        xref, w, h = img[0], img[2], img[3]
        if h == 0:
            continue
        ratio = w / h
        if not (ratio_lo <= ratio <= ratio_hi):
            continue
        for r in page.get_image_rects(xref):
            if r.width < min_width:
                continue
            if bounds is not None:
                overlap = r & bounds
                frac = (overlap.width * overlap.height) / (r.width * r.height)
                if frac < 0.6:
                    continue
            rects.append(r)
    return rects


def _photo_protect_boxes(page, crop_rect, zoom=ZOOM, margin=3):
    """
    Find any sample photo(s) inside `crop_rect` and convert their PDF-space
    rects into pixel-space boxes (relative to a render_clip(crop_rect,
    zoom) output), with a small margin so anti-aliased photo edges aren't
    left with a thin transparent ring.
    """
    boxes = []
    for pr in find_photo_rects(page, bounds=crop_rect):
        x0 = (pr.x0 - margin - crop_rect.x0) * zoom
        y0 = (pr.y0 - margin - crop_rect.y0) * zoom
        x1 = (pr.x1 + margin - crop_rect.x0) * zoom
        y1 = (pr.y1 + margin - crop_rect.y0) * zoom
        boxes.append((x0, y0, x1, y1))
    return boxes


# --------------------------------------------------------------------------
# Image extraction (no embedded/ folder — only the named images)
# --------------------------------------------------------------------------

def extract_images(pdf_path, out_dir, n_columns=4):
    """
    Extracts barcode.png, qr_code.png, proportions.png and clarity.png
    into out_dir. Does NOT create an 'embedded' folder and does NOT save
    any other embedded raster images.

    NOTE: clarity.png replaces the old clarity_characteristics_full.png
    output (same crop logic, just renamed). The old
    color_clarity_chart_full.png output has been removed entirely and is
    no longer produced.

    Returns: dict mapping image key -> absolute file path saved.
    """
    os.makedirs(out_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    saved = {}

    # This layout is a single-page report; loop defensively in case of
    # multi-page input, using a suffix only when there's more than 1 page.
    for pno, page in enumerate(doc):
        suffix = f"_p{pno + 1}" if len(doc) > 1 else ""

        # --- QR code ---
        qr_xref = find_qr_xref(page)
        if qr_xref:
            qr_pix = fitz.Pixmap(doc, qr_xref)
            if qr_pix.n - qr_pix.alpha >= 4:
                qr_pix = fitz.Pixmap(fitz.csRGB, qr_pix)
            native_path = os.path.join(out_dir, f"_qr_native_tmp{suffix}.png")
            qr_pix.save(native_path)
            qr_img = Image.open(native_path).convert("RGB")
            scale = max(1, 700 // max(qr_img.width, qr_img.height))
            qr_img = qr_img.resize(
                (qr_img.width * scale, qr_img.height * scale), Image.NEAREST
            )
            path = os.path.join(out_dir, f"qr_code{suffix}.png")
            qr_img.save(path)
            os.remove(native_path)
            remove_white_background(path)
            saved[f"qr_code{suffix}"] = path

        # --- Barcode (section 4 / last column) ---
        section4 = column_rect(page, n_columns - 1, n_columns)
        barcode_xref = find_barcode_xref(page, bounds=section4)
        if barcode_xref:
            bc_pix = fitz.Pixmap(doc, barcode_xref)
            if bc_pix.n - bc_pix.alpha >= 4:
                bc_pix = fitz.Pixmap(fitz.csRGB, bc_pix)
            native_path = os.path.join(out_dir, f"_barcode_native_tmp{suffix}.png")
            bc_pix.save(native_path)
            bc_img = Image.open(native_path).convert("RGB")
            scale = max(1, 900 // max(bc_img.width, bc_img.height))
            bc_img = bc_img.resize(
                (bc_img.width * scale, bc_img.height * scale), Image.NEAREST
            )
            path = os.path.join(out_dir, f"barcode{suffix}.png")
            bc_img.save(path)
            os.remove(native_path)
            remove_white_background(path)
            saved[f"barcode{suffix}"] = path

        # --- Proportions diagram ---
        start = find_heading(page, "PROPORTIONS")
        end = find_heading(page, "CLARITY CHARACTERISTICS")
        section2 = column_rect(page, 1, n_columns)
        if start:
            y1 = (end.y0 - 10) if end and end.y0 > start.y0 else min(
                page.rect.height, start.y1 + 140
            )
            rect = fitz.Rect(section2.x0, start.y1 + 10, section2.x1, y1)
            pix = render_clip(page, rect)
            path = os.path.join(out_dir, f"proportions{suffix}.png")
            pix.save(path)
            remove_white_background(path)
            saved[f"proportions{suffix}"] = path

        # --- Clarity block (section 2, full).
        #     Some layouts (e.g. lab-grown reports) place the "Sample
        #     Image Used" photo at the bottom of THIS section. Protect its
        #     bounding box so bright highlight pixels in the photo don't
        #     get erased by the white-background removal below it.
        #
        #     This is the sole clarity-related image produced now: it
        #     replaces the old clarity_characteristics_full.png (same
        #     crop logic, renamed to clarity.png), and the separate
        #     color_clarity_chart_full.png (section 3 COLOR/CLARITY scale
        #     chart) is no longer extracted at all. ---
        if n_columns > 1:
            blocks = page.get_text("blocks", clip=section2)
            www = find_heading(page, "www.igi.org")
            if blocks and www:
                topmost = min(blocks, key=lambda b: b[1])
                y0 = max(0, topmost[1] - 8)
                # Stop BEFORE the "www.igi.org" footer instead of
                # including it in the crop.
                y1 = max(y0, www.y0 - 10)
            else:
                y0, y1 = 0, page.rect.height

            # Tighten the right edge to the actual content extent (text
            # blocks + any embedded sample photo) instead of the fixed
            # column width, so we don't drag in blank page margin.
            probe_bounds = fitz.Rect(section2.x0, y0, section2.x1, y1)
            content_blocks = page.get_text("blocks", clip=probe_bounds)
            max_x = section2.x0
            for b in content_blocks:
                max_x = max(max_x, b[2])  # b[2] = block's x1
            for pr in find_photo_rects(page, bounds=probe_bounds):
                max_x = max(max_x, pr.x1)
            right_margin = 10
            x1 = min(section2.x1, max_x + right_margin)

            section2_full = fitz.Rect(section2.x0, y0, x1, y1)
            pix = render_clip(page, section2_full)
            path = os.path.join(out_dir, f"clarity{suffix}.png")
            pix.save(path)
            protect_boxes = _photo_protect_boxes(page, section2_full)
            remove_white_background(path, protect_boxes=protect_boxes)
            trim_transparent_image(path, padding=12)
            saved[f"clarity{suffix}"] = path

        # NOTE: intentionally no "embedded/" dump here — only the named
        # images above are ever produced.

    return saved


# --------------------------------------------------------------------------
# Panel image extraction (whole-page 4-panel crop, rasterized via
# pdf2image) -- a coarser, layout-based alternative to extract_images().
# --------------------------------------------------------------------------

DPI = 300
PT_TO_PX = DPI / 72  # PDF coordinates are in points (72/inch)

# Panel boundaries, as FRACTIONS of the page width (0.0 - 1.0). Derived
# from the real text/image coordinates in the PDF (via PyMuPDF), so they
# hold at any DPI. Verified against a single-page 1008 x 612 pt report.
PANEL_SECTIONS = {
    "page1": (0.000, 0.248),  # summary (Electronic copy / report)
    "page2": (0.248, 0.501),  # proportions / clarity
    "page3": (0.501, 0.794),  # light performance
    "page4": (0.794, 1.000),  # narrow condensed certificate panel
}

# Regions to white-out, in PDF POINTS (full-page coordinates, before
# cropping into panels). Each was located from the PDF's own text/
# image bounding boxes, then padded slightly:
#   - page1 header: round IGI seal + "INTERNATIONAL GEMOLOGICAL
#     INSTITUTE" wordmark + "ELECTRONIC COPY" + "LABORATORY GROWN
#     DIAMOND REPORT" title
#   - page2: "www.igi.org" link text
#   - page3: the round gold IGI seal, and the security-measures note
#     box below the QR code (QR code itself is kept, and the
#     copyright line just above the note box is left untouched here --
#     it's redacted separately and dynamically, see
#     PANEL_FOOTER_REDACT_TEXTS / _panel_redact_footer_line below,
#     since its exact position shifts between report layouts)
#   - page4: the small IGI seal + "IGI" wordmark lockup
PANEL_REDACT_REGIONS_PT = [
    (0, 0, 235, 112),      # page1
    (375, 568, 446, 596),  # page2
    (638, 481, 708, 551),  # page3 - gold seal (NOT the QR code, which sits
                            #          just to the right at ~737-778,513-554
                            #          and must stay untouched)
    (554, 573, 797, 598),  # page3 - note box only; starts at y=573, just
                            #          below the copyright line (which ends
                            #          at y=571.8) so that text isn't clipped
    (818, 447, 932, 503),  # page4 - IGI logo lockup
]

# Footer text that must be redacted wherever it actually appears on the
# page, rather than at a fixed box. Different report layouts (Laboratory
# Grown Diamond Report vs. plain Diamond Report, different content in the
# panel above it, different measurements/comments length shifting things
# vertically) put this row at different x/y coordinates from one report
# batch to the next -- a hardcoded box only ever matches the exact layout
# it was measured against. Searching for the text itself via
# page.search_for() and redacting wherever it's actually found works
# across every layout.
PANEL_FOOTER_REDACT_TEXTS = [
    "International Gemological Institute",
    "FD - 10 20",
]


def _panel_redact_footer_line(page, draw, panel_x0, panel_x1, crop_x0, zoom, pad=4):
    """
    Find the "© IGI 2020, International Gemological Institute" / "FD - 10 20"
    footer row via page.search_for() (instead of a fixed box) and white it
    out in `draw`'s pixel space, but only for matches that actually fall
    within this panel's [panel_x0, panel_x1) horizontal slice of the page.

    Matching on "International Gemological Institute" also catches the
    "© IGI 2020, " prefix (same text run), and "FD - 10 20" catches the
    form code on the right -- both searched independently since they're
    separate text runs on the same line, then merged into a single
    redaction band spanning both, so the whole row disappears cleanly
    regardless of which report layout produced this panel.
    """
    rects = []
    for text in PANEL_FOOTER_REDACT_TEXTS:
        for r in page.search_for(text):
            # keep only matches inside this panel's horizontal slice
            if r.x1 > panel_x0 and r.x0 < panel_x1:
                rects.append(r)

    if not rects:
        return

    y0 = min(r.y0 for r in rects) - pad
    y1 = max(r.y1 for r in rects) + pad

    box = (
        int((panel_x0 - crop_x0) * zoom),
        int(y0 * zoom),
        int((panel_x1 - crop_x0) * zoom),
        int(y1 * zoom),
    )
    draw.rectangle(box, fill=(255, 255, 255))


# Grayscale watermark removal thresholds.
# The repeating "IGI" background pattern is genuinely gray (R≈G≈B)
# and light (>=225). Colored content (red hearts/arrows, the gold
# seal, the tan performance bars) and black text fall outside this
# range, so they're left untouched.
PANEL_GRAY_TOLERANCE = 10
PANEL_LIGHT_THRESHOLD = 225


def _panel_remove_watermark(im: Image.Image, protect_boxes=None) -> Image.Image:
    arr = np.array(im.convert("RGB")).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    gray_mean = (r + g + b) / 3
    is_grayish = (
        (np.abs(r - g) < PANEL_GRAY_TOLERANCE)
        & (np.abs(g - b) < PANEL_GRAY_TOLERANCE)
        & (np.abs(r - b) < PANEL_GRAY_TOLERANCE)
    )
    is_light = gray_mean >= PANEL_LIGHT_THRESHOLD
    mask = is_grayish & is_light

    if protect_boxes:
        h, w = mask.shape
        for (x0, y0, x1, y1) in protect_boxes:
            x0, y0 = max(0, int(x0)), max(0, int(y0))
            x1, y1 = min(w, int(x1)), min(h, int(y1))
            if x1 > x0 and y1 > y0:
                mask[y0:y1, x0:x1] = False

    arr[mask] = [255, 255, 255]
    return Image.fromarray(arr.astype(np.uint8))


def _panel_apply_redactions(im: Image.Image) -> Image.Image:
    draw = ImageDraw.Draw(im)
    for x0, y0, x1, y1 in PANEL_REDACT_REGIONS_PT:
        box = (
            int(x0 * PT_TO_PX),
            int(y0 * PT_TO_PX),
            int(x1 * PT_TO_PX),
            int(y1 * PT_TO_PX),
        )
        draw.rectangle(box, fill=(255, 255, 255))
    return im


# Panel keys that get the same high-fidelity extraction pipeline as
# clarity.png (direct PyMuPDF vector render, instead of pdf2image raster)
# because their watermark removal was noticeably worse under the old
# pdf2image-based path. Keep page1/page4 on the original pdf2image path.
_FITZ_PANEL_KEYS = {"page2", "page3"}


def _extract_panel_fitz(page, key, f0, f1, out_dir, dpi=DPI):
    zoom = dpi / 72
    x0 = page.rect.width * f0
    x1 = page.rect.width * f1
    rect = fitz.Rect(x0, 0, x1, page.rect.height)

    pix = render_clip(page, rect, zoom=zoom)
    path = os.path.join(out_dir, f"{key}.png")
    pix.save(path)

    # Compute the sample-photo protect boxes ONCE, up front, so both the
    # watermark strip and the white-background removal skip the same region.
    protect_boxes = _photo_protect_boxes(page, rect, zoom=zoom)

    # 1) strip the repeating watermark tint, but never inside the photo
    img = _panel_remove_watermark(Image.open(path).convert("RGB"), protect_boxes=protect_boxes)

    draw = ImageDraw.Draw(img)

    # 2) white-out the fixed logo/seal/note-box regions that intersect this panel
    for rx0, ry0, rx1, ry1 in PANEL_REDACT_REGIONS_PT:
        ix0, iy0 = max(rx0, x0), max(ry0, 0)
        ix1, iy1 = min(rx1, x1), min(ry1, page.rect.height)
        if ix1 <= ix0 or iy1 <= iy0:
            continue
        box = (
            int((ix0 - x0) * zoom),
            int(iy0 * zoom),
            int((ix1 - x0) * zoom),
            int(iy1 * zoom),
        )
        draw.rectangle(box, fill=(255, 255, 255))

    # 2b) dynamic footer redaction (unchanged)
    _panel_redact_footer_line(page, draw, x0, x1, x0, zoom)

    img.save(path)

    # 3) transparent background, protecting the same photo boxes
    remove_white_background(path, protect_boxes=protect_boxes)

    return path


def extract_panel_images(pdf_path, out_dir, dpi=DPI):
    """
    Splits page 1 of the PDF into 4 vertical panels (page1..page4) using
    PANEL_SECTIONS.

    page2 and page3 are rendered directly from the PDF via PyMuPDF and
    run through the same watermark/background cleanup as clarity.png
    (watermark strip + fixed-region redaction + dynamic footer-text
    redaction + transparent white removal) -- see _extract_panel_fitz().
    Their pixel dimensions are unchanged from before (no trim-to-content
    is applied, unlike clarity.png). page1 and page4 keep the original
    pdf2image-based raster pipeline.

    Saves page1.png, page2.png, page3.png, page4.png into out_dir.

    Returns: dict mapping panel key ("page1".."page4") -> absolute file
    path saved. Returns {} if pdf2image/poppler isn't available or the
    PDF has no pages.
    """
    if convert_from_path is None:
        raise RuntimeError(
            "pdf2image is not installed; install it (and poppler) to use "
            "extract_panel_images()."
        )

    os.makedirs(out_dir, exist_ok=True)

    doc = fitz.open(pdf_path)
    if len(doc) == 0:
        return {}
    fitz_page = doc[0]

    saved = {}

    # page2 / page3: fitz-based pipeline (same treatment as clarity.png)
    for key in _FITZ_PANEL_KEYS:
        f0, f1 = PANEL_SECTIONS[key]
        saved[key] = _extract_panel_fitz(fitz_page, key, f0, f1, out_dir, dpi=dpi)

    # page1 / page4: original pdf2image-based raster pipeline
    pages = convert_from_path(pdf_path, dpi=dpi)
    if len(pages) == 0:
        return saved

    page = pages[0].convert("RGB")
    width, height = page.size

    # 1) strip the repeating watermark background
    page = _panel_remove_watermark(page)
    # 2) white-out the specific logos / text called out above
    page = _panel_apply_redactions(page)

    for key, (f0, f1) in PANEL_SECTIONS.items():
        if key in _FITZ_PANEL_KEYS:
            continue
        x0 = int(width * f0)
        x1 = int(width * f1)
        cropped = page.crop((x0, 0, x1, height))
        save_path = os.path.join(out_dir, f"{key}.png")
        cropped.save(save_path)
        saved[key] = save_path

    return saved


# --------------------------------------------------------------------------
# Text / JSON data extraction
# --------------------------------------------------------------------------

_LABEL_MAP = {
    "IGI Report Number": "report_number",
    "Description": "description",
    "Shape and Cutting Style": "shape_and_cutting_style",
    "Measurements": "measurements",
    "Carat Weight": "carat_weight",
    "Color Grade": "color_grade",
    "Clarity Grade": "clarity_grade",
    "Cut Grade": "cut_grade",
    "Polish": "polish",
    "Symmetry": "symmetry",
    "Fluorescence": "fluorescence",
    "Inscription(s)": "inscriptions",
}

_DATE_RE = re.compile(r"^[A-Za-z]+ \d{1,2},\s*\d{4}$")


def _main_column_lines(page, n_columns):
    """Column 0 holds the primary, in-order label/value pairs."""
    rect = column_rect(page, 0, n_columns)
    text = page.get_text("text", clip=rect)
    return [_clean(l) for l in text.splitlines() if _clean(l)]


def _parse_label_value_pairs(lines):
    """
    Column 0 alternates: label line, then value line(s), in the fixed
    order defined by _LABEL_MAP. Comments run multi-line to the end.
    """
    data = {}
    n = len(lines)
    i = 0
    while i < n:
        line = lines[i]
        
        if line in _LABEL_MAP and i + 1 < n:
            key = _LABEL_MAP[line]
            value = lines[i + 1]
            if key == "inscriptions":
                value = _clean_inscription(value)
            data[key] = value
            i += 2
            continue
                
        if line in _LABEL_MAP and i + 1 < n:
            key = _LABEL_MAP[line]
            data[key] = lines[i + 1]
            i += 2
            continue
        if line.startswith("Comments:"):
            comment_lines = [line[len("Comments:"):].strip()]
            j = i + 1
            while j < n and lines[j] not in (
                "LABORATORY GROWN DIAMOND REPORT",
                "DIAMOND REPORT",
                "ELECTRONIC COPY",
            ):
                comment_lines.append(lines[j])
                j += 1
            data["comments"] = _clean(" ".join(comment_lines))
            i = j
            continue
        
        i += 1
    return data


def _find_report_date(lines):
    for l in lines:
        if _DATE_RE.match(l):
            return l
    return None


_CARAT_VALUE_RE = re.compile(r"^\d+(\.\d+)?\s*CARATS?$", re.I)


def _parse_depth_table_girdle_culet(page, n_columns):
    """
    The rightmost column repeats a compact vertical block: N values
    immediately followed by their 12 labels (Carat Weight, Color Grade,
    Clarity Grade, Cut Grade, Depth, Table, Girdle, Culet, Polish,
    Symmetry, Fluorescence, Inscription(s)). This is the only place
    Depth/Table/Girdle/Culet appear as clean discrete fields.

    The first 6 values (carat/color/clarity/cut/depth/table) and last 5
    (culet/polish/symmetry/fluorescence/inscription) are always single
    lines; only "Girdle" can wrap across multiple lines (e.g. "Slightly
    Thick To Thick" + "(Faceted)"), so whatever remains in the middle is
    joined together as the girdle value.
    """
    rect = column_rect(page, n_columns - 1, n_columns)
    text = page.get_text("text", clip=rect)
    lines = [_clean(l) for l in text.splitlines() if _clean(l)]

    label_seq = [
        "Carat Weight", "Color Grade", "Clarity Grade", "Cut Grade",
        "Depth", "Table", "Girdle", "Culet",
        "Polish", "Symmetry", "Fluorescence", "Inscription(s)",
    ]
    n = len(lines)
    empty = {"depth_percent": None, "table_percent": None, "girdle": None, "culet": None}

    for i in range(n - 4):
        if lines[i:i + 5] != label_seq[:5]:
            continue
        # walk backward from the label block to find where the value
        # block starts (anchored on the "Carat Weight" value, e.g. "1.21 CARAT")
        start = None
        for j in range(i - 1, -1, -1):
            if _CARAT_VALUE_RE.match(lines[j]):
                start = j
                break
        if start is None:
            continue
        values = lines[start:i]
        if len(values) < 11:
            continue
        girdle = " ".join(values[6:len(values) - 5])
        return {
            "depth_percent": values[4],
            "table_percent": values[5],
            "girdle": girdle,
            "culet": values[len(values) - 5],
        }
    return empty


def _parse_angles(page, n_columns):
    """Crown/pavilion angles (only present for brilliant-style diagrams
    with angle callouts, e.g. round brilliant)."""
    rect = column_rect(page, 1, n_columns)
    text = page.get_text("text", clip=rect)
    angles = re.findall(r"(\d+(?:\.\d+)?)\s*°", text)
    return {
        "crown_angle": f"{angles[0]}°" if len(angles) >= 1 else None,
        "pavilion_angle": f"{angles[1]}°" if len(angles) >= 2 else None,
    }


def _parse_light_performance(page):
    text = page.get_text("text")
    m = re.search(r"Light Performance Grade:\s*(\w+)", text)
    return m.group(1) if m else None


def _parse_growth_info(comments):
    if not comments:
        return {"growth_process": None, "diamond_type": None}
    process = None
    if re.search(r"Chemical Vapor Deposition|CVD", comments, re.I):
        process = "CVD"
    elif re.search(r"High Pressure High Temperature|HPHT", comments, re.I):
        process = "HPHT"
    type_match = re.search(r"\bType\s+(I{1,3}a?b?)\b", comments)
    return {
        "growth_process": process,
        "diamond_type": type_match.group(1) if type_match else None,
    }

def _clean(s):
    return re.sub(r"\s+", " ", s or "").strip()


def _clean_inscription(s):
    """
    Inscription values sometimes carry a leading icon glyph (e.g. a
    laser-inscription symbol embedded in the PDF's font) that gets
    extracted as a stray leading character, e.g. "Ä LG769613472".
    Strip any leading run of non-alphanumeric characters (and the
    whitespace after them), leaving just the real inscription code.
    """
    s = _clean(s)
    return re.sub(r"^[^A-Za-z0-9]+\s*", "", s)

def extract_data(pdf_path, n_columns=4):
    """Parse an IGI report PDF's text fields into a JSON-serializable dict."""
    doc = fitz.open(pdf_path)
    page = doc[0]

    lines = _main_column_lines(page, n_columns)
    data = _parse_label_value_pairs(lines)
    data["report_date"] = _find_report_date(lines)

    data.update(_parse_depth_table_girdle_culet(page, n_columns))
    data.update(_parse_angles(page, n_columns))
    data.update(_parse_growth_info(data.get("comments")))

    lp_grade = _parse_light_performance(page)
    if lp_grade:
        data["light_performance_grade"] = lp_grade

    # is_laboratory_grown convenience flag
    desc = (data.get("description") or "").upper()
    data["is_laboratory_grown"] = "LABORATORY GROWN" in desc

    # normalize ordering / drop Nones for a tidy response, but keep keys
    # explicit so consumers can always rely on the schema
    ordered_keys = [
        "report_number", "report_date", "description",
        "shape_and_cutting_style", "measurements",
        "carat_weight", "color_grade", "clarity_grade", "cut_grade",
        "depth_percent", "table_percent", "girdle", "culet",
        "crown_angle", "pavilion_angle",
        "polish", "symmetry", "fluorescence", "inscriptions",
        "comments", "growth_process", "diamond_type",
        "is_laboratory_grown", "light_performance_grade",
    ]
    return {k: data.get(k) for k in ordered_keys if k in data or k in (
        "report_number", "report_date", "description",
        "shape_and_cutting_style", "measurements", "carat_weight",
        "color_grade", "clarity_grade", "cut_grade", "polish",
        "symmetry", "fluorescence", "inscriptions", "comments",
        "depth_percent", "table_percent", "girdle", "culet",
        "crown_angle", "pavilion_angle", "growth_process",
        "diamond_type", "is_laboratory_grown",
    )}
    
