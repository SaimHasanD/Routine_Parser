import asyncio

_lock = asyncio.Lock()

_state: dict = {
    "groups": [],
    "index": {},
    "total": 0,
}


async def set_state(data: dict):
    async with _lock:
        _state["groups"] = data["groups"]
        _state["index"]  = data["index"]
        _state["total"]  = data["total"]


async def get_state() -> dict:
    async with _lock:
        return dict(_state)


def is_loaded() -> bool:
    return bool(_state["groups"])
