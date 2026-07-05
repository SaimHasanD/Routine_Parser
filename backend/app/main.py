import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

import shutil
import tempfile
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

try:
    from .shared import ADMIN_PASSWORD, SUPABASE_BUCKET, supabase_client, DATA_DIR, logger
except ImportError:
    from shared import ADMIN_PASSWORD, SUPABASE_BUCKET, supabase_client, DATA_DIR, logger

try:
    from .exam import router as exam_router
except ImportError:
    from exam import router as exam_router

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
    """Auto-load routine on startup. Priority: Supabase (Source of Truth) > local uploaded file > default test paths."""
    loaded = False

    if supabase_client:
        try:
            files = supabase_client.storage.from_(SUPABASE_BUCKET).list()
            excel_files = [f for f in files if isinstance(f, dict) and f.get('name', '').endswith('.xlsx')]
            if excel_files:
                excel_files.sort(key=lambda x: x.get('created_at', ''), reverse=True)
                latest_filename = excel_files[0]['name']
                file_bytes = supabase_client.storage.from_(SUPABASE_BUCKET).download(latest_filename)

                for old_file in DATA_DIR.glob("*.xlsx"):
                    old_file.unlink()

                dest_path = DATA_DIR / latest_filename
                with open(dest_path, "wb") as f:
                    f.write(file_bytes)
                logger.info(f"Force-synced latest routine '{latest_filename}' from Supabase bucket.")
        except Exception as e:
            logger.warning(f"Failed to force-sync from Supabase: {e}")

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

app.include_router(exam_router)


# ── Health ────────────────────────────────────────────────────────────────────

@app.api_route("/api/v1/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok", "loaded": is_loaded()}


# ── Admin Status ──────────────────────────────────────────────────────────────

@app.get("/api/v1/admin/status")
async def admin_status():
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
    if password != ADMIN_PASSWORD:
        raise HTTPException(401, "Invalid admin password.")

    if not file.filename.endswith(".xlsx"):
        raise HTTPException(400, "Only .xlsx files are supported.")

    if is_loaded() and not replace:
        raise HTTPException(
            409,
            "A routine is already loaded. Use replace to overwrite it."
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        data = await parse_excel(tmp_path)
    except Exception as exc:
        os.unlink(tmp_path)
        raise HTTPException(422, f"Failed to parse file: {exc}")

    for old_file in DATA_DIR.glob("*.xlsx"):
        old_file.unlink()

    dest = DATA_DIR / file.filename
    shutil.move(tmp_path, str(dest))

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
        if 1 <= h <= 7:
            h += 12
        elif h == 12:
            pass

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
    by_day = {}
    for e in entries:
        entry_copy = dict(e)
        entry_copy["start_time_24"] = normalize_to_24h(entry_copy.get("start_time", ""))
        entry_copy["end_time_24"] = normalize_to_24h(entry_copy.get("end_time", ""))
        by_day.setdefault(entry_copy.get("day"), []).append(entry_copy)

    merged_all = []
    for day, day_list in by_day.items():
        day_list.sort(key=lambda x: x["start_time_24"])

        merged_day = []
        for e in day_list:
            if not merged_day:
                merged_day.append(e)
                continue

            prev = merged_day[-1]

            prev_teacher_name = prev["teacher"]["name"] if isinstance(prev.get("teacher"), dict) else prev.get("teacher")
            curr_teacher_name = e["teacher"]["name"] if isinstance(e.get("teacher"), dict) else e.get("teacher")

            if (prev["course_code"] == e["course_code"] and
                prev_teacher_name == curr_teacher_name and
                prev["room"] == e["room"] and
                prev["end_time_24"] == e["start_time_24"]):

                prev["end_time_24"] = e["end_time_24"]
            else:
                merged_day.append(e)

        for e in merged_day:
            e["start_time"] = to_12h_format(e["start_time_24"])
            e["end_time"] = to_12h_format(e["end_time_24"])
            e["time_slot"] = f"{e['start_time']} – {e['end_time']}"
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

    seen, unique = set(), []
    for e in entries:
        teacher_name = e["teacher"]["name"] if isinstance(e.get("teacher"), dict) else e.get("teacher")
        key = (e.get("day"), e["time_slot"], e["course_code"], e["section_type"], teacher_name)
        if key not in seen:
            seen.add(key)
            unique.append(dict(e))

    merged = merge_consecutive_entries(unique)

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
