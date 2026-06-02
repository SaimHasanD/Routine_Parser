# NUB Routine Generator

ECSE class schedule viewer for Northern University Bangladesh.

## What the project does

This project parses Excel-based class schedules and provides a web interface for students to view their routines. It extracts regular, lab, and online class data from uploaded spreadsheets. The application maps teacher acronyms to full names and handles specific schedule overrides automatically.

## Key features

- Parses Excel schedule files into structured data
- Displays a weekly schedule grid for specific student groups
- Generates downloadable PDF and image versions of the routine
- Includes an administrative interface for uploading new schedule files

## Tech stack

- Frontend: React, Vite, Tailwind CSS
- Backend: FastAPI, Python, openpyxl

## Getting started

1. Clone the repository to your local machine.
2. Navigate to the `backend` directory and install the Python dependencies using `pip install -r requirements.txt`.
3. Start the backend server by running `python -m uvicorn app.main:app --reload --port 8000`.
4. Open a new terminal, navigate to the `frontend` directory, and install the Node dependencies using `npm install`.
5. Start the frontend development server by running `npm run dev`.
6. Access the application at `http://localhost:5173`.

## Current state

The project is fully operational. For a detailed breakdown of the codebase, API endpoints, and resolved issues, see the [CURRENT_STATE.md](CURRENT_STATE.md) file.

## Contributing

Contributions are welcome. Please submit a pull request with your proposed changes or open an issue to discuss new features or bugs.

