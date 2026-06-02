import os
import shutil
import tempfile
import logging
import glob
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware

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

# Persistent storage for the single active routine file
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

# Default file paths for initial auto-load (fallback if no uploaded routine exists)
DEFAULT_ROUTINE_PATHS = [
    os.environ.get("ROUTINE_FILE_PATH", ""),
    str(Path(__file__).resolve().parent.parent / "test_data" / "Version_1_ ECSE Class Routine Summer 2025.xlsx"),
    str(Path(__file__).resolve().parent.parent.parent / "Version_1_ ECSE Class Routine Summer 2025.xlsx"),
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Auto-load routine on startup. Priority: uploaded file in data/ > default test_data paths."""
    loaded = False

    # 1) Check for a previously uploaded routine in data/
    uploaded_files = sorted(DATA_DIR.glob("*.xlsx"))
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

@app.get("/api/v1/mother", response_model=GroupRoutineResponse)
async def get_mother_routine():
    """Return the ECSE master routine (the first ECSE group)."""
    state = await get_state()
    for group_id, entries in state["index"].items():
        if group_id.upper().startswith("ECSE"):
            # reuse existing deduplication and merge logic
            # Deduplicate merged-cell duplicates by (day, time_slot, course_code, section_type, teacher name)
            seen, unique = set(), []
            for e in entries:
                teacher_name = e["teacher"]["name"] if isinstance(e.get("teacher"), dict) else e.get("teacher")
                key = (e.get("day"), e["time_slot"], e["course_code"], e["section_type"], teacher_name)
                if key not in seen:
                    seen.add(key)
                    unique.append(dict(e))
            merged = merge_consecutive_entries(unique)
            merged.sort(key=lambda e: (
                {"Sunday":0,"Monday":1,"Tuesday":2,"Wednesday":3,"Thursday":4,"Friday":5,"Saturday":6}.get(e.get("day","Sunday"),99),
                normalize_to_24h(e.get("start_time",""))
            ))
            return GroupRoutineResponse(group=group_id, entries=[ScheduleEntry(**e) for e in merged])
    raise HTTPException(404, "No ECSE master routine found")


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

    await set_state(data, filename=file.filename)

    action = "Replaced" if replace else "Uploaded"
    return UploadResponse(
        groups=data["groups"],
        total_entries=data["total"],
        message=f"{action} successfully. {data['total']} entries across {len(data['groups'])} groups.",
    )


# ── Groups ────────────────────────────────────────────────────────────────────

@app.get("/api/v1/groups")
async def list_groups():
    state = await get_state()
    return {"groups": state["groups"]}


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

    return GroupRoutineResponse(group=group_id, entries=[ScheduleEntry(**e) for e in merged])
