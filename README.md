# NUB Routine Generator

ECSE class schedule viewer for Northern University Bangladesh.

## Quick Start (Frontend Only)

```bash
cd frontend
npm install
npm run dev
```

Opens at http://localhost:5173

- Public view: `/`
- Admin upload: `/admin` (password: `admin123_nu`)

## Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: FastAPI + Python (coming next)

## Mock Mode

`src/services/api.js` has `USE_MOCK = true` — flip to `false` once backend is running.

## Folder Structure

```
nub-routine-generator/
├── frontend/
│   └── src/
│       ├── App.jsx               ← router + nav
│       ├── screens/
│       │   ├── DashboardScreen.jsx   ← student view
│       │   └── UploadScreen.jsx      ← admin upload
│       ├── components/
│       │   └── RoutineTable.jsx      ← schedule grid
│       └── services/
│           └── api.js                ← all API calls here
└── backend/
    └── app/
        ├── main.py       ← FastAPI endpoints
        ├── parser.py     ← Excel parser
        ├── storage.py    ← cloud blob
        └── state.py      ← RAM cache
```
