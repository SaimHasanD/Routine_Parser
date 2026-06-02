import os
import tempfile
from fastapi.testclient import TestClient
from backend.app.main import app, ADMIN_PASSWORD
from openpyxl import Workbook

# Create minimal ECSE routine Excel file
wb = Workbook()
ws = wb.active
ws.append(["Group", "Course", "Teacher", "Room", "Day", "Time", "Section", "Section Type", "Odd/Even", "Week Note"])  # header
ws.append(["ECSE", "CSE 1102", "Prof X", "101", "Monday", "9:00 AM", "Lecture", "regular", "", ""])
# Save to temporary file
fd, path = tempfile.mkstemp(suffix='.xlsx')
os.close(fd)
wb.save(path)

client = TestClient(app)

# First upload (should succeed)
response = client.post(
    "/api/v1/upload",
    files={"file": ("test.xlsx", open(path, 'rb'), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    data={"password": ADMIN_PASSWORD}
)
print('First upload status:', response.status_code)
print('Response:', response.json())

# Second upload without replace (should fail for ECSE)
response2 = client.post(
    "/api/v1/upload",
    files={"file": ("test2.xlsx", open(path, 'rb'), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    data={"password": ADMIN_PASSWORD}
)
print('Second upload (no replace) status:', response2.status_code)
print('Response:', response2.json())

# Third upload with replace=True (should succeed)
response3 = client.post(
    "/api/v1/upload",
    files={"file": ("test3.xlsx", open(path, 'rb'), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    data={"password": ADMIN_PASSWORD, "replace": "true"}
)
print('Third upload (replace) status:', response3.status_code)
print('Response:', response3.json())

# Test mother endpoint
response_mother = client.get("/api/v1/mother")
print('Mother endpoint status:', response_mother.status_code)
print('Mother response:', response_mother.json())

# Cleanup
os.unlink(path)
