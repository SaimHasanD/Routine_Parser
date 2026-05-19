from openpyxl.worksheet.worksheet import Worksheet
from .merge_resolver import build_merge_map, get_cell_value
from .cell_parser import parse_cell

REGULAR_START_ROW = 5
REGULAR_END_ROW   = 40


def parse_regular_section(ws: Worksheet, time_slots: dict, merge_map: dict) -> list[dict]:
    """
    Iterates rows 5-40. Each row = one room.
    For every time slot column, parses cell content.
    Returns list of raw schedule entries (teacher_acro not yet resolved).
    """
    entries = []

    for row_idx in range(REGULAR_START_ROW, REGULAR_END_ROW + 1):
        room_val = get_cell_value(ws, row_idx, 1, merge_map)
        if not room_val or not isinstance(room_val, str):
            continue

        room = room_val.strip().replace("\n", " ")

        for col_idx, time_slot in time_slots.items():
            cell_val = get_cell_value(ws, row_idx, col_idx, merge_map)
            if not cell_val:
                continue

            parsed = parse_cell(str(cell_val))
            for p in parsed:
                entries.append({
                    **p,
                    "room":         room,
                    "time_slot":    time_slot,
                    "section_type": "regular",
                    "week_note":    "",
                })

    return entries
