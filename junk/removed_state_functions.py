# Removed from backend/app/state.py

async def clear_state():
    async with _lock:
        _state["title"] = None
        _state["season"] = None
        _state["odd_week_dates"] = []
        _state["even_week_dates"] = []
        _state["groups"] = []
        _state["index"] = {}
        _state["total"] = 0
        _routine_meta["filename"] = None
        _routine_meta["uploaded_at"] = None
        _routine_meta["groups_count"] = 0
        _routine_meta["total_entries"] = 0
