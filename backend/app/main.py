import os
import base64
import json
import shutil
import tempfile
import logging
import glob
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

try:
    from .models import UploadResponse, GroupRoutineResponse, ScheduleEntry, Teacher
except ImportError:
    from models import UploadResponse, GroupRoutineResponse, ScheduleEntry, Teacher

try:
    from .state import set_state, get_state, is_loaded, get_routine_meta, clear_state
except ImportError:
    from state import set_state, get_state, is_loaded, get_routine_meta, clear_state

try:
    from .parser import parse_excel
except ImportError:
    from parser import parse_excel

logger = logging.getLogger("uvicorn.error")

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123_nu")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "routine-files")

supabase_client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client, Client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except ImportError:
        logger.warning("Supabase configured but 'supabase' library is not installed.")
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}")

# Persistent storage for the single active routine file
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Exam schedule JSON path (same data directory)
EXAM_SCHEDULE_PATH = DATA_DIR / "exam_schedule.json"

# Google Cloud Vision client — credentials loaded from env var (JSON string)
vision_client = None
_gcp_creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
if _gcp_creds_json:
    try:
        from google.cloud import vision as _vision_mod
        from google.oauth2 import service_account as _sa_mod
        _gcp_info = json.loads(_gcp_creds_json)
        _gcp_credentials = _sa_mod.Credentials.from_service_account_info(
            _gcp_info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        vision_client = _vision_mod.ImageAnnotatorClient(credentials=_gcp_credentials)
        logger.info("Google Cloud Vision client initialised.")
    except Exception as _e:
        logger.warning(f"Failed to initialise Google Cloud Vision client: {_e}")

# Default file paths for initial auto-load (fallback if no uploaded routine exists)
DEFAULT_ROUTINE_PATHS = [
    os.environ.get("ROUTINE_FILE_PATH", ""),
    str(Path(__file__).resolve().parent.parent / "test_data" / "Version_1_ ECSE Class Routine Summer 2025.xlsx"),
    str(Path(__file__).resolve().parent.parent.parent / "Version_1_ ECSE Class Routine Summer 2025.xlsx"),
]


def _resolve_source_file() -> Path | None:
    files = sorted(DATA_DIR.glob("*.xlsx"))
    if files:
        return files[0]
    for path in DEFAULT_ROUTINE_PATHS:
        if path and os.path.isfile(path):
            return Path(path)
    return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Auto-load routine on startup. Priority: uploaded file in data/ > default test_data paths."""
    loaded = False

    # 1) Check for a previously uploaded routine in data/
    uploaded_files = sorted(DATA_DIR.glob("*.xlsx"))
    
    # Fetch from Supabase if no local file (e.g. after Render restart)
    if not uploaded_files and supabase_client:
        try:
            files = supabase_client.storage.from_(SUPABASE_BUCKET).list()
            excel_files = [f for f in files if isinstance(f, dict) and f.get('name', '').endswith('.xlsx')]
            if excel_files:
                excel_files.sort(key=lambda x: x.get('created_at', ''), reverse=True)
                latest_filename = excel_files[0]['name']
                file_bytes = supabase_client.storage.from_(SUPABASE_BUCKET).download(latest_filename)
                
                dest_path = DATA_DIR / latest_filename
                with open(dest_path, "wb") as f:
                    f.write(file_bytes)
                uploaded_files = [dest_path]
                logger.info(f"Downloaded latest routine '{latest_filename}' from Supabase bucket.")
        except Exception as e:
            logger.warning(f"Failed to fetch from Supabase: {e}")

    if uploaded_files:
        path = str(uploaded_files[0])
        try:
            data = await parse_excel(path)
            await set_state(data, filename=uploaded_files[0].name)
            logger.info(f"Auto-loaded uploaded routine: {uploaded_files[0].name} "
                        f"({len(data['groups'])} groups, {data['total']} entries)")
            loaded = True
        except Exception as e:
            logger.warning(f"Failed to auto-load uploaded routine {path}: {e}")

    # 2) Fallback to default paths if no uploaded routine
    if not loaded:
        for path in DEFAULT_ROUTINE_PATHS:
            if path and os.path.isfile(path):
                try:
                    data = await parse_excel(path)
                    await set_state(data, filename=Path(path).name)
                    logger.info(f"Auto-loaded default routine: {Path(path).name} "
                                f"({len(data['groups'])} groups, {data['total']} entries)")
                    loaded = True
                except Exception as e:
                    logger.warning(f"Failed to auto-load routine from {path}: {e}")
                break

    if not loaded:
        logger.info("No routine file found — upload required.")
    yield


app = FastAPI(title="ECSE Routine Generator", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "loaded": is_loaded()}


# ── Admin Status ──────────────────────────────────────────────────────────────

@app.get("/api/v1/admin/status")
async def admin_status():
    """Return info about the currently loaded routine (if any)."""
    meta = await get_routine_meta()
    return {
        "loaded": is_loaded(),
        "filename": meta["filename"],
        "uploaded_at": meta["uploaded_at"],
        "groups_count": meta["groups_count"],
        "total_entries": meta["total_entries"],
    }


# ── Upload ────────────────────────────────────────────────────────────────────

@app.post("/api/v1/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...), password: str = Form(""), replace: bool = Form(False)):
    # Server-side auth
    if password != ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid admin password.")

    if not file.filename.endswith(".xlsx"):
        raise HTTPException(400, "Only .xlsx files are supported.")

    # Enforce single-routine policy: add if 0, require replace=True if 1
    if is_loaded() and not replace:
        raise HTTPException(
            409,
            "A routine is already loaded. Use replace to overwrite it."
        )

    # Save to a temp file first for parsing
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        data = await parse_excel(tmp_path)
    except Exception as exc:
        os.unlink(tmp_path)
        raise HTTPException(422, f"Failed to parse file: {exc}")

    # Clear old routine files from data/ before saving new one
    for old_file in DATA_DIR.glob("*.xlsx"):
        old_file.unlink()

    # Persist the uploaded file to data/
    dest = DATA_DIR / file.filename
    shutil.move(tmp_path, str(dest))

    # Sync to Supabase
    if supabase_client:
        try:
            files = supabase_client.storage.from_(SUPABASE_BUCKET).list()
            old_files = [f['name'] for f in files if isinstance(f, dict) and f.get('name', '').endswith('.xlsx')]
            if old_files:
                supabase_client.storage.from_(SUPABASE_BUCKET).remove(old_files)
                
            with open(dest, "rb") as f:
                file_bytes = f.read()
            supabase_client.storage.from_(SUPABASE_BUCKET).upload(
                file.filename,
                file_bytes,
                file_options={"content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
            )
            logger.info(f"Uploaded '{file.filename}' to Supabase bucket '{SUPABASE_BUCKET}'")
        except Exception as e:
            logger.warning(f"Failed to sync with Supabase: {e}")

    await set_state(data, filename=file.filename)

    action = "Replaced" if replace else "Uploaded"
    return UploadResponse(
        groups=data["groups"],
        total_entries=data["total"],
        title=data.get("title"),
        season=data.get("season"),
        odd_week_dates=data.get("odd_week_dates", []),
        even_week_dates=data.get("even_week_dates", []),
        message=f"{action} successfully. {data['total']} entries across {len(data['groups'])} groups."
    )


# ── Groups ────────────────────────────────────────────────────────────────────

@app.get("/api/v1/groups")
async def list_groups():
    state = await get_state()
    meta = await get_routine_meta()
    source_path = _resolve_source_file()
    return {
        "groups": state["groups"],
        "title": state.get("title"),
        "season": state.get("season"),
        "source_filename": meta["filename"],
        "source_available": source_path is not None and is_loaded(),
    }


@app.get("/api/v1/source-file")
async def download_source_file():
    if not is_loaded():
        raise HTTPException(404, "No routine loaded.")

    source_path = _resolve_source_file()
    if source_path is None:
        raise HTTPException(404, "Source file not found on disk.")

    meta = await get_routine_meta()
    filename = meta["filename"] or source_path.name

    return FileResponse(
        path=str(source_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
    )


# ── Routine by group ──────────────────────────────────────────────────────────

def normalize_to_24h(t_str: str) -> str:
    s = t_str.strip().upper()
    if not s:
        return "00:00"
        
    is_pm = "PM" in s
    is_am = "AM" in s
    
    s = s.replace("AM", "").replace("PM", "").strip()
    parts = s.split(":")
    if len(parts) < 2:
        try:
            h = int(parts[0])
            m = 0
        except ValueError:
            return "00:00"
    else:
        try:
            h = int(parts[0])
            m = int(parts[1])
        except ValueError:
            return "00:00"
            
    if is_pm:
        if h < 12:
            h += 12
    elif is_am:
        if h == 12:
            h = 0
    else:
        # Implicit rule based on standard school hours:
        # Hours 1, 2, 3, 4, 5, 6, 7 are afternoon (PM)
        # Hours 8, 9, 10, 11 are morning (AM)
        # Hour 12 is afternoon (PM)
        if 1 <= h <= 7:
            h += 12
        elif h == 12:
            pass # 12 is 12:00 (PM)
            
    return f"{h:02d}:{m:02d}"


def to_12h_format(t_24h: str) -> str:
    parts = t_24h.split(":")
    if len(parts) != 2:
        return t_24h
    try:
        h = int(parts[0])
        m = int(parts[1])
    except ValueError:
        return t_24h
        
    suffix = "AM"
    if h >= 12:
        suffix = "PM"
        if h > 12:
            h -= 12
    elif h == 0:
        h = 12
        
    return f"{h}:{m:02d} {suffix}"


def merge_consecutive_entries(entries: list[dict]) -> list[dict]:
    # Group by day
    by_day = {}
    for e in entries:
        entry_copy = dict(e)
        entry_copy["start_time_24"] = normalize_to_24h(entry_copy.get("start_time", ""))
        entry_copy["end_time_24"] = normalize_to_24h(entry_copy.get("end_time", ""))
        by_day.setdefault(entry_copy.get("day"), []).append(entry_copy)

    merged_all = []
    for day, day_list in by_day.items():
        # Sort chronologically by 24h start time string
        day_list.sort(key=lambda x: x["start_time_24"])
        
        merged_day = []
        for e in day_list:
            if not merged_day:
                merged_day.append(e)
                continue
            
            prev = merged_day[-1]
            
            # Resolve teacher names for comparison
            prev_teacher_name = prev["teacher"]["name"] if isinstance(prev.get("teacher"), dict) else prev.get("teacher")
            curr_teacher_name = e["teacher"]["name"] if isinstance(e.get("teacher"), dict) else e.get("teacher")
            
            # Compare using 24h normalized times
            if (prev["course_code"] == e["course_code"] and 
                prev_teacher_name == curr_teacher_name and 
                prev["room"] == e["room"] and 
                prev["end_time_24"] == e["start_time_24"]):
                
                # Merge: update the 24h end time of previous to current 24h end time
                prev["end_time_24"] = e["end_time_24"]
            else:
                merged_day.append(e)
                
        # Format the 24h times back to 12h AM/PM for display
        for e in merged_day:
            e["start_time"] = to_12h_format(e["start_time_24"])
            e["end_time"] = to_12h_format(e["end_time_24"])
            # Format time_slot with correct en-dash / hyphen
            e["time_slot"] = f"{e['start_time']} – {e['end_time']}"
            # Remove temporary 24h keys
            e.pop("start_time_24", None)
            e.pop("end_time_24", None)
            
        merged_all.extend(merged_day)
    return merged_all


@app.get("/api/v1/routine/{group_id}", response_model=GroupRoutineResponse)
async def get_routine(group_id: str):
    state = await get_state()
    group_id = group_id.upper()

    if not state["groups"]:
        raise HTTPException(404, "No routine loaded. Please upload a file first.")

    entries = state["index"].get(group_id)
    if entries is None:
        raise HTTPException(404, f"Group '{group_id}' not found.")

    # Deduplicate merged-cell duplicates by (day, time_slot, course_code, section_type, teacher name)
    seen, unique = set(), []
    for e in entries:
        teacher_name = e["teacher"]["name"] if isinstance(e.get("teacher"), dict) else e.get("teacher")
        key = (e.get("day"), e["time_slot"], e["course_code"], e["section_type"], teacher_name)
        if key not in seen:
            seen.add(key)
            unique.append(dict(e))

    # Merge consecutive periods
    merged = merge_consecutive_entries(unique)

    # Sort by day and then start time
    day_order = {"Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6}
    
    def sort_key(e):
        day_idx = day_order.get(e.get("day", "Sunday"), 99)
        start_24 = normalize_to_24h(e.get("start_time", ""))
        return (day_idx, start_24)

    merged.sort(key=sort_key)

    return GroupRoutineResponse(
        group=group_id,
        title=state.get("title"),
        season=state.get("season"),
        odd_week_dates=state.get("odd_week_dates", []),
        even_week_dates=state.get("even_week_dates", []),
        entries=[ScheduleEntry(**e) for e in merged]
    )


# ── Exam Schedule ─────────────────────────────────────────────────────────────


def _pdf_first_page_to_png(src_path: str) -> str:
    """Render the first page of a PDF to a temp PNG file. Returns the PNG path."""
    try:
        from pdf2image import convert_from_path
    except ImportError:
        raise HTTPException(500, "pdf2image is not installed. Cannot process PDF files.")

    images = convert_from_path(src_path, first_page=1, last_page=1, dpi=200)
    if not images:
        raise HTTPException(422, "Could not render any pages from the PDF.")

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
    images[0].save(tmp.name, format="PNG")
    tmp.close()
    return tmp.name


def parse_exam_text(raw_text: str) -> dict:
    """
    Parse raw OCR text from an exam schedule image into a structured dict.

    Expected output:
    {
      "semester": "Spring 2026",
      "note": "...",
      "slots": {"slot1": "...", "slot2": "...", "slot3": "..."},
      "schedule": [
        {
          "date": "DD/MM/YYYY",
          "day": "<day name>",
          "slot1": ["CSE 4136: Computer Networks (7)"],
          "slot2": [...],
          "slot3": []
        }
      ]
    }
    """
    import re

    lines = [ln.strip() for ln in raw_text.splitlines()]
    lines = [ln for ln in lines if ln]  # drop blank lines

    semester = ""
    note = None
    slots: dict[str, str] = {}
    schedule: list[dict] = []

    # ── Patterns ────────────────────────────────────────────────────────────
    # Date: DD/MM/YYYY or DD-MM-YYYY optionally followed by a day name
    date_pat = re.compile(
        r"""(?P<date>\d{1,2}[/\-]\d{1,2}[/\-]\d{4})\s*"""
        r"""(?P<day>[A-Za-z]+)?""",
        re.IGNORECASE,
    )
    # Course entry: letters/digits + space(s) + digits, colon, rest, optional (N)
    course_pat = re.compile(
        r"[A-Z]{2,}\s*\d{3,}.*?:\s*.+",
        re.IGNORECASE,
    )
    # Slot time line: e.g. "Slot 1: 9:00 AM – 11:00 AM" or "Slot-1 9:00AM-11:00AM"
    slot_pat = re.compile(
        r"slot\s*[-:]?\s*(\d)\s*[:\-]?\s*(.+)",
        re.IGNORECASE,
    )
    # Note / footnote markers
    note_pat = re.compile(r"^(note|\*|\†|footnote)[:\s]", re.IGNORECASE)

    # ── First pass: collect semester, slots, notes ────────────────────────
    for ln in lines:
        # Slot time descriptions
        m = slot_pat.match(ln)
        if m:
            key = f"slot{m.group(1)}"
            slots[key] = m.group(2).strip()
            continue

        # Note / footnote
        if note_pat.match(ln):
            note = ln
            continue

        # Semester title heuristic: a line with a season word + 4-digit year
        if re.search(r"(spring|summer|fall|winter|autumn)\s+\d{4}", ln, re.IGNORECASE):
            semester = ln
            continue

    # Ensure all three slot keys exist (fill blanks if the image only listed some)
    for i in range(1, 4):
        slots.setdefault(f"slot{i}", "")

    # ── Second pass: collect schedule rows ───────────────────────────────
    current_entry: dict | None = None
    # We'll accumulate courses per slot by tracking which slot column we're in.
    # Many exam tables list courses sequentially under each date row, grouped by slot.
    # Strategy: when we see a date line → start new entry; following course lines
    # belong to slots in order unless a slot marker resets the counter.
    slot_cursor = 1  # which slot we're currently filling (1-3)

    for ln in lines:
        # New date row ⟹ flush previous entry, start fresh
        dm = date_pat.search(ln)
        if dm:
            if current_entry:
                schedule.append(current_entry)
            raw_date = dm.group("date").replace("-", "/")
            # Normalise to DD/MM/YYYY (ensure two-digit day and month)
            parts = raw_date.split("/")
            if len(parts) == 3:
                raw_date = f"{int(parts[0]):02d}/{int(parts[1]):02d}/{parts[2]}"
            day_name = (dm.group("day") or "").strip().capitalize()
            # If the day name isn't on this line, try the next non-empty line
            current_entry = {
                "date": raw_date,
                "day": day_name,
                "slot1": [],
                "slot2": [],
                "slot3": [],
            }
            slot_cursor = 1
            continue

        if current_entry is None:
            continue

        # Explicit slot marker mid-table resets the cursor
        sm = slot_pat.match(ln)
        if sm:
            slot_cursor = int(sm.group(1))
            continue

        # Course line
        if course_pat.match(ln):
            slot_key = f"slot{slot_cursor}"
            if slot_key in current_entry:
                current_entry[slot_key].append(ln)
            # Advance cursor: if multiple courses appear sequentially without a
            # slot marker, each new course goes to the next slot (common layout).
            if slot_cursor < 3:
                slot_cursor += 1
            continue

        # A bare day name following a date line fills in the missing day
        if current_entry and not current_entry["day"]:
            days = {"sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"}
            if ln.lower() in days:
                current_entry["day"] = ln.capitalize()

    # Flush last entry
    if current_entry:
        schedule.append(current_entry)

    return {
        "semester": semester,
        "note": note,
        "slots": slots,
        "schedule": schedule,
    }


@app.post("/api/v1/exam/upload")
async def upload_exam_schedule(
    file: UploadFile = File(...),
    password: str = Form(""),
):
    """Admin-only. Accept an image or PDF of the exam schedule, run Google
    Cloud Vision OCR, parse the result, and persist it to exam_schedule.json."""
    if password != ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid admin password.")

    if vision_client is None:
        raise HTTPException(
            500,
            "GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set "
            "or the Vision client failed to initialise.",
        )

    filename_lower = (file.filename or "").lower()
    is_pdf = filename_lower.endswith(".pdf")
    is_image = any(
        filename_lower.endswith(ext)
        for ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".tiff", ".bmp")
    )

    if not (is_pdf or is_image):
        raise HTTPException(
            400,
            "Only image files (.png, .jpg, .jpeg, .webp, .tiff, .bmp) or PDF files are supported.",
        )

    # ── Save upload to temp file ─────────────────────────────────────────
    suffix = ".pdf" if is_pdf else Path(file.filename or "upload").suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    png_path: str | None = None
    try:
        # For PDF: convert first page to PNG
        if is_pdf:
            try:
                png_path = _pdf_first_page_to_png(tmp_path)
                image_path = png_path
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(422, f"PDF conversion failed: {exc}")
        else:
            image_path = tmp_path

        # ── Read image bytes and call Vision OCR ────────────────────────
        with open(image_path, "rb") as f:
            content = f.read()

        try:
            from google.cloud import vision as _vision_mod

            gv_image = _vision_mod.Image(content=content)
            response = vision_client.document_text_detection(image=gv_image)
            if response.error.message:
                raise HTTPException(
                    502,
                    f"Google Vision API error: {response.error.message}",
                )
            raw_text = response.full_text_annotation.text
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(502, f"Google Cloud Vision call failed: {exc}")

    finally:
        # Clean up temp files
        for p in (tmp_path, png_path):
            if p:
                try:
                    os.unlink(p)
                except FileNotFoundError:
                    pass

    if not raw_text.strip():
        raise HTTPException(422, "Vision OCR returned no text. Check the uploaded image quality.")

    # ── Parse OCR text into structured JSON ─────────────────────────────
    try:
        schedule_data = parse_exam_text(raw_text)
    except Exception as exc:
        raise HTTPException(422, f"Failed to parse OCR text: {exc}")

    # ── Persist to disk ──────────────────────────────────────────────────
    EXAM_SCHEDULE_PATH.write_text(
        json.dumps(schedule_data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    logger.info(f"Exam schedule saved to {EXAM_SCHEDULE_PATH} "
                f"({len(schedule_data.get('schedule', []))} exam days)")

    return {"success": True, "entries": len(schedule_data.get("schedule", []))}


@app.get("/api/v1/exam")
async def get_exam_schedule():
    """Public. Returns the cached exam schedule JSON or 404 if not uploaded yet."""
    if not EXAM_SCHEDULE_PATH.exists():
        raise HTTPException(404, "No exam schedule uploaded yet")

    try:
        data = json.loads(EXAM_SCHEDULE_PATH.read_text(encoding="utf-8"))
    except Exception as exc:
        raise HTTPException(500, f"Failed to read exam schedule: {exc}")

    return data
