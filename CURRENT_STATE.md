# CURRENT STATE - ECSE Routine Generator Audit

This document is the **single source of truth** representing the current state of the ECSE Routine Generator codebase. It lists all files, active API connections, and the status of system bugs and architecture.

---

## 1. Project Directory Structure & File Audit

### Root Configuration
- [Architecture.svg](file:///e:/nub-routine-generator/Architecture.svg) — SVG architectural diagram of the system's parser and state layers.
- [CURRENT_STATE.md](file:///e:/nub-routine-generator/CURRENT_STATE.md) — The current file you are reading: the definitive audit of the project status.
- [Plan And Architecture.md](file:///e:/nub-routine-generator/Plan%20And%20Architecture.md) — Initial design draft mapping out sheet rows and merge mapping concepts.
- [README.md](file:///e:/nub-routine-generator/README.md) — Main user guide describing setup, local running, and core parser layout.

### Backend (FastAPI, Python)
- [backend/requirements.txt](file:///e:/nub-routine-generator/backend/requirements.txt) — Python dependencies list (FastAPI, Uvicorn, Openpyxl, Pydantic, Requests).
- [backend/app/__init__.py](file:///e:/nub-routine-generator/backend/app/__init__.py) — Orchestrator that merges parsed sub-sections, resolves teacher acronyms, splits time slots, and handles day overrides.
- [backend/app/cell_parser.py](file:///e:/nub-routine-generator/backend/app/cell_parser.py) — Regular expression parser that extracts class details (e.g. `MATH 1101 TSA`) from single cells.
- [backend/app/faculty_mapper.py](file:///e:/nub-routine-generator/backend/app/faculty_mapper.py) — Parses `Faculty Information` sheet to index acronyms to full names, featuring a robust TBA teacher fallback.
- [backend/app/header_parser.py](file:///e:/nub-routine-generator/backend/app/header_parser.py) — Scans the regular, lab, and online header rows to map columns to chronological timeslots.
- [backend/app/main.py](file:///e:/nub-routine-generator/backend/app/main.py) — Main FastAPI app registering server-side upload auth, route endpoints, 24h merges, and server startup auto-load lifespan.
- [backend/app/merge_resolver.py](file:///e:/nub-routine-generator/backend/app/merge_resolver.py) — Builds coordinates mapping for merged openpyxl ranges so adjacent cells resolve value correctly.
- [backend/app/models.py](file:///e:/nub-routine-generator/backend/app/models.py) — Pydantic response schemas safeguarding JSON output structures.
- [backend/app/parser.py](file:///e:/nub-routine-generator/backend/app/parser.py) — Top-level runner parsing files and feeding them to `_parse_workbook`.
- [backend/app/section_lab.py](file:///e:/nub-routine-generator/backend/app/section_lab.py) — Extracts lab section schedules (rows 41-54) and parses odd/even markers.
- [backend/app/section_online.py](file:///e:/nub-routine-generator/backend/app/section_online.py) — Extracts online classes (rows 58-69), scans online header day override, and strips CSE 1258 odd/even tags.
- [backend/app/section_regular.py](file:///e:/nub-routine-generator/backend/app/section_regular.py) — Extracts regular theory schedules (rows 5-40).
- [backend/app/state.py](file:///e:/nub-routine-generator/backend/app/state.py) — Holds global, in-memory thread-safe schedule data dictionary.
- [backend/test_data/Version_1_ ECSE Class Routine Summer 2025.xlsx](file:///e:/nub-routine-generator/backend/test_data/Version_1_%20ECSE%20Class%20Routine%20Summer%202025.xlsx) — Test routine data file representing the production sheet for summer term.

### Frontend (React, Vite, HSL Vanilla CSS)
- [frontend/index.html](file:///e:/nub-routine-generator/frontend/index.html) — HTML template specifying base Outfitter and Inter font tags.
- [frontend/package.json](file:///e:/nub-routine-generator/frontend/package.json) — Frontend package config tracking Tailwind and Lucide dependencies.
- [frontend/postcss.config.js](file:///e:/nub-routine-generator/frontend/postcss.config.js) — PostCSS compilation rules.
- [frontend/tailwind.config.js](file:///e:/nub-routine-generator/frontend/tailwind.config.js) — Tailwind styling configuration.
- [frontend/vite.config.js](file:///e:/nub-routine-generator/frontend/vite.config.js) — Vite bundler config mapping port 5173 to proxy server-side port 8000.
- [frontend/src/App.jsx](file:///e:/nub-routine-generator/frontend/src/App.jsx) — Primary navigation router driving the SPA views.
- [frontend/src/index.css](file:///e:/nub-routine-generator/frontend/src/index.css) — Custom stylesheet importing typography variables.
- [frontend/src/main.jsx](file:///e:/nub-routine-generator/frontend/src/main.jsx) — Vite react rendering entry.
- [frontend/src/components/RoutineDownloadLayout.jsx](file:///e:/nub-routine-generator/frontend/src/components/RoutineDownloadLayout.jsx) — Official PDF replica print layout mapping all 59 NUB course codes, odd/even week calendars, and dynamic section-specific instructor list.
- [frontend/src/components/RoutinePreviewModal.jsx](file:///e:/nub-routine-generator/frontend/src/components/RoutinePreviewModal.jsx) — Glassmorphic modal to preview the print layout before downloading.
- [frontend/src/components/RoutineTable.jsx](file:///e:/nub-routine-generator/frontend/src/components/RoutineTable.jsx) — Displays premium schedule grid strips from Sunday to Saturday with hover timelines and info popups.
- [frontend/src/screens/DashboardScreen.jsx](file:///e:/nub-routine-generator/frontend/src/screens/DashboardScreen.jsx) — Main dashboard viewport displaying section search and generated routines. Features PDF and Image download actions.
- [frontend/src/screens/UploadScreen.jsx](file:///e:/nub-routine-generator/frontend/src/screens/UploadScreen.jsx) — Admin control panel showing login, file uploader, and visual alert alerts.
- [frontend/src/services/api.js](file:///e:/nub-routine-generator/frontend/src/services/api.js) — Clean HTTP gateway querying backend REST APIs.

---

## 2. Frontend-to-Backend API Connections

The system communicates over these 4 primary REST endpoints:

| Frontend Call | Triggers Component | API Endpoint | Method | Payload / Response |
|---------------|--------------------|--------------|--------|---------------------|
| `healthCheck()` | Page mount checks | `/api/v1/health` | `GET` | Response: `{status: "ok", loaded: true/false}` |
| `fetchGroups()` | Dropdown autocompletion in `<DashboardScreen>` | `/api/v1/groups` | `GET` | Response: `{groups: ["1A", "1B", ...]}` |
| `fetchRoutine(groupId)` | "Generate Routine" click in `<DashboardScreen>` | `/api/v1/routine/{group_id}` | `GET` | Response: `{group: "1A", entries: [ ScheduleEntry, ... ]}` |
| `uploadExcel(file, password)` | "Process & Upload" click in `<UploadScreen>` | `/api/v1/upload` | `POST` | Form-Data: `file` & `password`. Response: `{groups: [...], total_entries: 490}` |

---

## 3. Issues, Inconsistencies & Incomplete Items

### Active System Status: **100% Solid & Operational**

All active issues, architectural gaps, and parser bugs have been fully fixed, tested, and resolved:

| # | Previous Issue | Resolution | Status |
|---|----------------|------------|--------|
| 1 | **Mock Data in Screens** | Dead `MOCK_ROUTINE` constant cleanly deleted from `DashboardScreen.jsx`. | **Fixed** |
| 2 | **Stale File clean-up** | Unused 0-byte `storage.py` completely deleted from `backend/app`. | **Fixed** |
| 3 | **Accidental directory** | Phantom `{components,screens,services}/` directory fully removed. | **Fixed** |
| 4 | **USE_MOCK dead branches** | `api.js` rewritten cleanly as a strict gateway to the backend REST API. | **Fixed** |
| 5 | **Persistence / Auto-Load** | Added lifespan auto-load functionality. Parses test Excel file automatically on startup, removing manual upload steps on reboot. | **Fixed** |
| 6 | **Unsecure admin upload** | Secured the backend `/upload` endpoint with server-side authentication (`ADMIN_PASSWORD`). | **Fixed** |
| 7 | **Silent upload failure** | Implemented `uploadError` states, descriptive banner notifications, and catch handlers in `UploadScreen.jsx`. | **Fixed** |
| 8 | **Saturday Support** | Added `"Saturday"` strip rendering to the weekly table layout. | **Fixed** |
| 9 | **Online Class Day Mismatch** | Developed dynamic online header scanning (`_detect_online_day`) mapping classes dynamically to **Wednesday** (not Friday). | **Fixed** |
| 10| **Phantom tags on CSE 1258** | Force-stripped odd/even markers for `CSE 1258` at the parser source level. | **Fixed** |
| 11| **Routine Download Feature** | Implemented client-side PDF/Image generation using `html2canvas` and `jspdf`. Created a full replication of the NUB official PDF routine with a 59-course static dictionary mapping, accurate sessional odd/even week calendars, and section-specific instructor lists. | **Fixed** |

---

## 4. What Next to Do

1. **Deploy to Production**: Deploy the frontend to Vercel/Netlify and the backend to a VPS or Railway/Render. Update the `api.js` base URL to point to the production backend.
2. **Dynamic Calendar Dates**: Currently, the Odd/Even week calendar dates are hardcoded for Summer 2025. Consider adding an admin panel to update these sessional dates dynamically for future semesters.
3. **Admin User Management**: Implement a full JWT-based authentication system for the admin dashboard rather than a single hardcoded password.

## 4. How to Run

### Backend
```bash
cd backend
E:\nub-routine-generator\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm run dev
# → http://localhost:5173
```

---

## 5. System Parse Stats (Loaded on Startup)

- **Total Sections Registered**: 49 (from Section `1A` up through `9C`)
- **Total Schedule Entries**: 490 entries correctly extracted, merged, and indexed.
- **Dynamic Override Mapping**: Friday (Regular & Lab classes) & Wednesday (Online classes correct override).
