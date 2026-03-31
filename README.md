# AcadWatch v2 — Daily Academic Risk Dashboard

ML-powered student risk detection with **Excel-backed storage** and a daily-use dashboard for teachers and students.

---

## Project Structure

```
acadwatch-v2/
├── backend/
│   ├── main.py              # FastAPI — risk engine + Excel read/write
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.js               # Sidebar layout + routing
│   │   └── pages/
│   │       ├── Dashboard.js     # ★ Daily dashboard (main page)
│   │       ├── Students.js      # Full student list with filters
│   │       ├── AddStudent.js    # Teacher + student entry form
│   │       ├── Recommendations.js  # Track pending/done actions
│   │       └── Results.js       # Prediction report
│   └── ...
├── docker-compose.yml
└── README.md
```

---

## How to Run

### Option A — Docker (Recommended)

```bash
docker-compose up --build
```

- **Dashboard** → http://localhost:3000
- **API docs**  → http://localhost:8000/docs
- **Excel file** → saved to `./excel_data/acadwatch_data.xlsx` on your machine

### Option B — Local Development

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (new terminal)
```bash
cd frontend
npm install
npm start
```

---

## Excel File — 4 Sheets

| Sheet | Contents |
|-------|----------|
| **Students** | Master record — one row per student, updates in place |
| **Daily_Log** | Every update ever made — date, who updated, what changed |
| **Recommendations** | All generated recommendations + Pending/Done status |
| **Dashboard_Summary** | Snapshot of today's KPIs (auto-refreshed) |

The Excel file is at `./excel_data/acadwatch_data.xlsx` (Docker) or `./backend/acadwatch_data.xlsx` (local).

---

## Daily Workflow

### For Teachers
1. Open Dashboard → see today's at-risk count, attendance avg, pending recs
2. See **"Worsened Today"** alert if any student slipped from Pass → At Risk
3. Go to **Students** → click **Update** next to any student
4. Adjust sliders → hit **Save & Predict Risk** → result saved to Excel instantly
5. Go to **Recommendations** → mark actions as Done as you complete them

### For Students
1. Go to **Add / Update**
2. Select **"Student"** role — Academic fields (marks, GPA) are locked
3. Update daily fields: sleep, mobile usage, study hours, stress, attendance
4. Submit → logged in Daily_Log sheet with `updated_by: student`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Full daily dashboard data |
| GET | `/students` | All students |
| POST | `/students` | Add or update a student (saves to Excel) |
| GET | `/recommendations` | All recommendations |
| PUT | `/recommendations/status` | Mark a recommendation Done/Pending |
| POST | `/seed` | Load 6 demo students |
| GET | `/export/daily-report` | Today's log entries |

---

## Input Features

| Feature | Category | Who Updates |
|---------|----------|------------|
| Internal Marks | Academic | Teacher only |
| Previous GPA | Academic | Teacher only |
| Assignment Scores | Academic | Teacher only |
| Attendance % | Behavioral | Both |
| Study Hours/Day | Behavioral | Student/Teacher |
| Sleep Duration | Lifestyle | Student |
| Mobile Usage/Day | Lifestyle | Student |
| Stress Level | Psychological | Student |
| Interest in Subject | Psychological | Student |

---

## Tech Stack

- **Backend:** Python 3.11, FastAPI, openpyxl, pandas, Uvicorn
- **Frontend:** React 18, React Router v6, Recharts, CSS Variables
- **Storage:** Excel (.xlsx) — 4 sheets, color-coded, formatted
- **Container:** Docker + Nginx
- **Design:** Light professional theme, Syne + DM Sans fonts, navy sidebar
