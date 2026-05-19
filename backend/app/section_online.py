from openpyxl.worksheet.worksheet import Worksheet
from .merge_resolver import get_cell_value, build_merge_map
from .cell_parser import parse_cell
from .header_parser import parse_online_time_headers
import re

ONLINE_LABEL_ROW   = 58
ONLINE_HEADER_ROW  = 60
ONLINE_START_ROW   = 61
ONLINE_END_ROW     = 69
ONLINE_ROOM        = "Online"
ODD_MARKER         = "odd"
EVEN_MARKER        = "even"


def _detect_online_day(ws: Worksheet) -> str | None:
    """Parse the online section label row (e.g. 'Online Classes (Saturday/ Wednesday)')
    to determine what day online classes fall on."""
    for c in range(1, 15):
        val = ws.cell(ONLINE_LABEL_ROW, c).value
        if val and isinstance(val, str) and "online" in val.lower():
            text = val.lower()
            # Look for day names in the label
            day_map = {
                "wednesday": "Wednesday",
                "saturday": "Saturday",
                "sunday": "Sunday",
                "monday": "Monday",
                "tuesday": "Tuesday",
                "thursday": "Thursday",
                "friday": "Friday",
            }
            # Prefer Wednesday if multiple days mentioned (university convention)
            if "wednesday" in text:
                return "Wednesday"
            for key, name in day_map.items():
                if key in text:
                    return name
    return None


def parse_online_section(ws: Worksheet, merge_map: dict) -> list[dict]:
    """
    Online classes: single time header row at 60, then odd/even sub-rows.
    No room column — room is always 'Online'.
    Day is detected from the label row (e.g. 'Online Classes (Saturday/ Wednesday)').
    """
    entries = []
    time_slots = parse_online_time_headers(ws, ONLINE_HEADER_ROW)
    online_day = _detect_online_day(ws)

    for row_idx in range(ONLINE_START_ROW, ONLINE_END_ROW + 1):
        # Prevent leakage of merged cell markers from upper sections (e.g. lab section above row 61)
        week_marker_val = ws.cell(row_idx, 3).value
        if week_marker_val is None:
            # Check if it is merged within the online section boundaries
            for merge_range in ws.merged_cells.ranges:
                if row_idx in range(merge_range.min_row, merge_range.max_row + 1) and 3 in range(merge_range.min_col, merge_range.max_col + 1):
                    if merge_range.min_row >= ONLINE_START_ROW:
                        week_marker_val = ws.cell(merge_range.min_row, merge_range.min_col).value
                    break

        week_marker = str(week_marker_val or "").strip().lower()

        if ODD_MARKER in week_marker:
            week_note = "Odd weeks only"
            section_type = "online_odd"
        elif EVEN_MARKER in week_marker:
            week_note = "Even weeks only"
            section_type = "online_even"
        else:
            week_note = ""
            section_type = "online"

        for col_idx, time_slot in time_slots.items():
            cell_val = get_cell_value(ws, row_idx, col_idx, merge_map)
            if not cell_val:
                continue

            parsed = parse_cell(str(cell_val))
            for p in parsed:
                # Forcefully remove odd/even tag for CSE 1258 at the source
                curr_sec_type = section_type
                curr_week_note = week_note
                if p["course_code"].strip().upper().replace(" ", "") == "CSE1258":
                    curr_sec_type = "online"
                    curr_week_note = ""

                entry = {
                    **p,
                    "room":         ONLINE_ROOM,
                    "time_slot":    time_slot,
                    "section_type": curr_sec_type,
                    "week_note":    curr_week_note,
                }
                # Tag with detected online day so __init__.py can override the sheet day
                if online_day:
                    entry["_online_day"] = online_day
                entries.append(entry)

    return entries

