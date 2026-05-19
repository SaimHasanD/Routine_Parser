from openpyxl.worksheet.worksheet import Worksheet
from .merge_resolver import get_cell_value
from .cell_parser import parse_cell

LAB_START_ROW = 43
LAB_END_ROW   = 54
ODD_MARKER    = "odd"
EVEN_MARKER   = "even"


def parse_lab_section(ws: Worksheet, time_slots: dict, merge_map: dict) -> list[dict]:
    """
    Lab rooms span 2 rows: odd week (row N) and even week (row N+1).
    Col A = room (merged across 2 rows), Col B = odd/even marker.
    """
    entries = []

    row_idx = LAB_START_ROW
    while row_idx <= LAB_END_ROW:
        room_val = get_cell_value(ws, row_idx, 1, merge_map)
        if not room_val or not isinstance(room_val, str):
            row_idx += 1
            continue

        room = room_val.strip().replace("\n", " ")

        for sub_row in [row_idx, row_idx + 1]:
            week_marker_val = get_cell_value(ws, sub_row, 2, merge_map) or ""
            week_marker = str(week_marker_val).strip().lower()

            if ODD_MARKER in week_marker:
                week_note = "Odd weeks only"
                section_type = "lab_odd"
            elif EVEN_MARKER in week_marker:
                week_note = "Even weeks only"
                section_type = "lab_even"
            else:
                week_note = ""
                section_type = "lab"

            for col_idx, time_slot in time_slots.items():
                if col_idx <= 2:
                    continue
                cell_val = get_cell_value(ws, sub_row, col_idx, merge_map)
                if not cell_val:
                    continue

                parsed = parse_cell(str(cell_val))
                for p in parsed:
                    entries.append({
                        **p,
                        "room":         room,
                        "time_slot":    time_slot,
                        "section_type": section_type,
                        "week_note":    week_note,
                    })

        row_idx += 2

    return entries
