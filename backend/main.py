import os
import json
import uuid
import logging
from datetime import datetime, date
from typing import Optional, List

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.dummy import DummyClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AcadWatch API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Data file paths
# ---------------------------------------------------------------------------
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_FILE = os.path.join(DATA_DIR, "..", "acadwatch_data.xlsx")
STUDENTS_FILE = os.path.join(DATA_DIR, "students.json")
LOGS_FILE = os.path.join(DATA_DIR, "daily_logs.json")

# ---------------------------------------------------------------------------
# In-memory stores (loaded/persisted to JSON)
# ---------------------------------------------------------------------------
students_db: dict = {}
daily_logs_db: list = []

# ---------------------------------------------------------------------------
# ML models
# ---------------------------------------------------------------------------
risk_model = None
recommendation_model = None
label_encoder = LabelEncoder()


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

def load_json_store(filepath: str, default):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load {filepath}: {e}")
    return default


def save_json_store(filepath: str, data):
    try:
        with open(filepath, "w") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Could not save {filepath}: {e}")


# ---------------------------------------------------------------------------
# Excel data loading
# ---------------------------------------------------------------------------

def load_excel_data() -> pd.DataFrame:
    """Load student data from the Excel file if it exists."""
    if not os.path.exists(EXCEL_FILE):
        logger.warning(f"Excel file not found at {EXCEL_FILE}")
        return pd.DataFrame()
    try:
        df = pd.read_excel(EXCEL_FILE, sheet_name=0)
        logger.info(f"Loaded {len(df)} rows from Excel file")
        return df
    except Exception as e:
        logger.error(f"Failed to read Excel file: {e}")
        return pd.DataFrame()


def import_students_from_excel():
    """Populate students_db from the Excel file on startup."""
    global students_db
    df = load_excel_data()
    if df.empty:
        return

    # Normalise column names
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    for _, row in df.iterrows():
        student_id = str(row.get("student_id", uuid.uuid4()))
        students_db[student_id] = {
            "id": student_id,
            "name": str(row.get("name", row.get("student_name", "Unknown"))),
            "grade": str(row.get("grade", row.get("class", "N/A"))),
            "attendance_rate": float(row.get("attendance_rate", row.get("attendance", 0.0))),
            "gpa": float(row.get("gpa", row.get("grade_point_average", 0.0))),
            "assignments_completed": int(row.get("assignments_completed", row.get("assignments", 0))),
            "risk_level": str(row.get("risk_level", row.get("risk", "unknown"))),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

    logger.info(f"Imported {len(students_db)} students from Excel")


# ---------------------------------------------------------------------------
# ML training
# ---------------------------------------------------------------------------

def train_models():
    """Train risk and recommendation models from available student data.

    Falls back to DummyClassifier when training data contains only a single
    class (e.g. all students are labelled 'low' risk), which would cause
    standard classifiers to raise a ValueError.
    """
    global risk_model, recommendation_model, label_encoder

    if not students_db:
        logger.warning("No student data available for training — skipping ML training")
        return

    records = list(students_db.values())
    df = pd.DataFrame(records)

    required_cols = {"attendance_rate", "gpa", "assignments_completed", "risk_level"}
    if not required_cols.issubset(df.columns):
        logger.warning("Student data missing required columns for ML training")
        return

    df = df.dropna(subset=list(required_cols))
    if len(df) < 2:
        logger.warning("Not enough data rows for ML training")
        return

    # Encode target labels
    risk_labels = df["risk_level"].astype(str).str.lower()
    unique_classes = risk_labels.unique()
    logger.info(f"Unique risk classes in training data: {unique_classes}")

    label_encoder.fit(risk_labels)
    y = label_encoder.transform(risk_labels)

    feature_cols = ["attendance_rate", "gpa", "assignments_completed"]
    X = df[feature_cols].values.astype(float)

    # -----------------------------------------------------------------------
    # Risk model — fall back to DummyClassifier for single-class data
    # -----------------------------------------------------------------------
    if len(unique_classes) < 2:
        logger.warning(
            "Training data contains only one risk class ('%s'). "
            "Falling back to DummyClassifier for risk model.",
            unique_classes[0],
        )
        risk_model = DummyClassifier(strategy="most_frequent")
        risk_model.fit(X, y)
    else:
        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=y
            )
            risk_model = RandomForestClassifier(n_estimators=100, random_state=42)
            risk_model.fit(X_train, y_train)
            logger.info("Risk model trained successfully (RandomForestClassifier)")
        except ValueError as exc:
            logger.warning(
                "RandomForestClassifier training failed (%s). "
                "Falling back to DummyClassifier.",
                exc,
            )
            risk_model = DummyClassifier(strategy="most_frequent")
            risk_model.fit(X, y)

    # -----------------------------------------------------------------------
    # Recommendation model — same single-class guard
    # -----------------------------------------------------------------------
    if len(unique_classes) < 2:
        logger.warning(
            "Training data contains only one risk class. "
            "Falling back to DummyClassifier for recommendation model.",
        )
        recommendation_model = DummyClassifier(strategy="most_frequent")
        recommendation_model.fit(X, y)
    else:
        try:
            recommendation_model = GradientBoostingClassifier(
                n_estimators=50, random_state=42
            )
            recommendation_model.fit(X, y)
            logger.info("Recommendation model trained successfully (GradientBoostingClassifier)")
        except ValueError as exc:
            logger.warning(
                "GradientBoostingClassifier training failed (%s). "
                "Falling back to DummyClassifier.",
                exc,
            )
            recommendation_model = DummyClassifier(strategy="most_frequent")
            recommendation_model.fit(X, y)


# ---------------------------------------------------------------------------
# Risk & recommendation helpers
# ---------------------------------------------------------------------------

RISK_THRESHOLDS = {
    "high": {"attendance_rate": 75.0, "gpa": 2.0, "assignments_completed": 60},
    "medium": {"attendance_rate": 85.0, "gpa": 2.5, "assignments_completed": 75},
}

RECOMMENDATIONS = {
    "high": [
        "Schedule immediate meeting with academic advisor",
        "Enrol in tutoring programme",
        "Contact parents/guardians",
        "Create personalised improvement plan",
        "Monitor weekly progress",
    ],
    "medium": [
        "Schedule check-in with teacher",
        "Recommend study groups",
        "Review assignment submission habits",
        "Provide additional learning resources",
    ],
    "low": [
        "Continue current performance",
        "Encourage participation in advanced programmes",
        "Recognise achievements",
    ],
    "unknown": [
        "Gather more data to assess student risk",
        "Schedule initial assessment meeting",
    ],
}


def compute_risk_level(student: dict) -> str:
    """Compute risk level using the ML model when available, else rule-based."""
    attendance = float(student.get("attendance_rate", 0))
    gpa = float(student.get("gpa", 0))
    assignments = int(student.get("assignments_completed", 0))

    if risk_model is not None:
        try:
            X = np.array([[attendance, gpa, assignments]])
            pred = risk_model.predict(X)
            return label_encoder.inverse_transform(pred)[0]
        except Exception as e:
            logger.warning(f"ML risk prediction failed: {e} — using rule-based fallback")

    # Rule-based fallback
    t = RISK_THRESHOLDS
    if (
        attendance < t["high"]["attendance_rate"]
        or gpa < t["high"]["gpa"]
        or assignments < t["high"]["assignments_completed"]
    ):
        return "high"
    if (
        attendance < t["medium"]["attendance_rate"]
        or gpa < t["medium"]["gpa"]
        or assignments < t["medium"]["assignments_completed"]
    ):
        return "medium"
    return "low"


def get_recommendations(risk_level: str) -> List[str]:
    return RECOMMENDATIONS.get(risk_level.lower(), RECOMMENDATIONS["unknown"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class StudentCreate(BaseModel):
    name: str
    grade: str
    attendance_rate: float = 0.0
    gpa: float = 0.0
    assignments_completed: int = 0


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    attendance_rate: Optional[float] = None
    gpa: Optional[float] = None
    assignments_completed: Optional[int] = None


class DailyLogCreate(BaseModel):
    student_id: str
    date: str
    attendance: bool = True
    notes: Optional[str] = None
    assignments_submitted: int = 0


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    global students_db, daily_logs_db

    # Load persisted data
    students_db = load_json_store(STUDENTS_FILE, {})
    daily_logs_db = load_json_store(LOGS_FILE, [])

    # Import from Excel if no persisted students
    if not students_db:
        import_students_from_excel()
        save_json_store(STUDENTS_FILE, students_db)

    # Train ML models
    train_models()
    logger.info("AcadWatch API started successfully")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "2.0.0",
        "students_count": len(students_db),
        "logs_count": len(daily_logs_db),
        "risk_model": type(risk_model).__name__ if risk_model else None,
        "recommendation_model": type(recommendation_model).__name__ if recommendation_model else None,
    }


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@app.get("/api/dashboard")
async def get_dashboard():
    """Return aggregated statistics for the dashboard."""
    if not students_db:
        return {
            "total_students": 0,
            "high_risk": 0,
            "medium_risk": 0,
            "low_risk": 0,
            "average_attendance": 0.0,
            "average_gpa": 0.0,
            "recent_logs": [],
        }

    records = list(students_db.values())
    risk_counts = {"high": 0, "medium": 0, "low": 0, "unknown": 0}
    total_attendance = 0.0
    total_gpa = 0.0

    for s in records:
        risk = compute_risk_level(s)
        risk_counts[risk] = risk_counts.get(risk, 0) + 1
        total_attendance += float(s.get("attendance_rate", 0))
        total_gpa += float(s.get("gpa", 0))

    n = len(records)
    recent_logs = sorted(daily_logs_db, key=lambda x: x.get("date", ""), reverse=True)[:10]

    return {
        "total_students": n,
        "high_risk": risk_counts.get("high", 0),
        "medium_risk": risk_counts.get("medium", 0),
        "low_risk": risk_counts.get("low", 0),
        "unknown_risk": risk_counts.get("unknown", 0),
        "average_attendance": round(total_attendance / n, 2),
        "average_gpa": round(total_gpa / n, 2),
        "recent_logs": recent_logs,
    }


# ---------------------------------------------------------------------------
# Students CRUD
# ---------------------------------------------------------------------------

@app.get("/api/students")
async def list_students(risk_filter: Optional[str] = None, grade: Optional[str] = None):
    records = list(students_db.values())

    # Enrich with computed risk
    for s in records:
        s["computed_risk"] = compute_risk_level(s)

    if risk_filter:
        records = [s for s in records if s["computed_risk"].lower() == risk_filter.lower()]
    if grade:
        records = [s for s in records if s.get("grade", "").lower() == grade.lower()]

    return {"students": records, "total": len(records)}


@app.get("/api/students/{student_id}")
async def get_student(student_id: str):
    student = students_db.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    risk = compute_risk_level(student)
    return {
        **student,
        "computed_risk": risk,
        "recommendations": get_recommendations(risk),
    }


@app.post("/api/students", status_code=201)
async def create_student(payload: StudentCreate):
    student_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    student = {
        "id": student_id,
        "name": payload.name,
        "grade": payload.grade,
        "attendance_rate": payload.attendance_rate,
        "gpa": payload.gpa,
        "assignments_completed": payload.assignments_completed,
        "risk_level": "unknown",
        "created_at": now,
        "updated_at": now,
    }
    students_db[student_id] = student
    save_json_store(STUDENTS_FILE, students_db)

    # Retrain models with new data
    train_models()

    risk = compute_risk_level(student)
    return {
        **student,
        "computed_risk": risk,
        "recommendations": get_recommendations(risk),
    }


@app.put("/api/students/{student_id}")
async def update_student(student_id: str, payload: StudentUpdate):
    student = students_db.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = payload.dict(exclude_none=True)
    student.update(update_data)
    student["updated_at"] = datetime.utcnow().isoformat()
    students_db[student_id] = student
    save_json_store(STUDENTS_FILE, students_db)

    # Retrain models with updated data
    train_models()

    risk = compute_risk_level(student)
    return {
        **student,
        "computed_risk": risk,
        "recommendations": get_recommendations(risk),
    }


@app.delete("/api/students/{student_id}")
async def delete_student(student_id: str):
    if student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student not found")
    del students_db[student_id]
    save_json_store(STUDENTS_FILE, students_db)
    return {"message": f"Student {student_id} deleted successfully"}


# ---------------------------------------------------------------------------
# Daily logs
# ---------------------------------------------------------------------------

@app.get("/api/logs")
async def list_logs(student_id: Optional[str] = None, limit: int = 50):
    logs = daily_logs_db
    if student_id:
        logs = [l for l in logs if l.get("student_id") == student_id]
    logs = sorted(logs, key=lambda x: x.get("date", ""), reverse=True)[:limit]
    return {"logs": logs, "total": len(logs)}


@app.post("/api/logs", status_code=201)
async def create_log(payload: DailyLogCreate):
    if payload.student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student not found")

    log_id = str(uuid.uuid4())
    log = {
        "id": log_id,
        "student_id": payload.student_id,
        "date": payload.date,
        "attendance": payload.attendance,
        "notes": payload.notes,
        "assignments_submitted": payload.assignments_submitted,
        "created_at": datetime.utcnow().isoformat(),
    }
    daily_logs_db.append(log)
    save_json_store(LOGS_FILE, daily_logs_db)

    # Update student attendance rate based on logs
    student_logs = [l for l in daily_logs_db if l["student_id"] == payload.student_id]
    if student_logs:
        attended = sum(1 for l in student_logs if l.get("attendance", False))
        attendance_rate = (attended / len(student_logs)) * 100
        students_db[payload.student_id]["attendance_rate"] = round(attendance_rate, 2)
        students_db[payload.student_id]["updated_at"] = datetime.utcnow().isoformat()
        save_json_store(STUDENTS_FILE, students_db)

    return log


@app.delete("/api/logs/{log_id}")
async def delete_log(log_id: str):
    global daily_logs_db
    original_len = len(daily_logs_db)
    daily_logs_db = [l for l in daily_logs_db if l.get("id") != log_id]
    if len(daily_logs_db) == original_len:
        raise HTTPException(status_code=404, detail="Log not found")
    save_json_store(LOGS_FILE, daily_logs_db)
    return {"message": f"Log {log_id} deleted successfully"}


# ---------------------------------------------------------------------------
# Risk & recommendations endpoints
# ---------------------------------------------------------------------------

@app.get("/api/students/{student_id}/risk")
async def get_student_risk(student_id: str):
    student = students_db.get(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    risk = compute_risk_level(student)
    return {
        "student_id": student_id,
        "student_name": student.get("name"),
        "risk_level": risk,
        "recommendations": get_recommendations(risk),
        "metrics": {
            "attendance_rate": student.get("attendance_rate"),
            "gpa": student.get("gpa"),
            "assignments_completed": student.get("assignments_completed"),
        },
    }


@app.get("/api/risk-summary")
async def get_risk_summary():
    """Return a risk breakdown across all students."""
    summary = {"high": [], "medium": [], "low": [], "unknown": []}
    for student in students_db.values():
        risk = compute_risk_level(student)
        summary.setdefault(risk, []).append({
            "id": student["id"],
            "name": student.get("name"),
            "grade": student.get("grade"),
        })
    return {
        "summary": {k: {"count": len(v), "students": v} for k, v in summary.items()}
    }


# ---------------------------------------------------------------------------
# Model info endpoint
# ---------------------------------------------------------------------------

@app.get("/api/model-info")
async def get_model_info():
    return {
        "risk_model": {
            "type": type(risk_model).__name__ if risk_model else None,
            "trained": risk_model is not None,
            "is_fallback": isinstance(risk_model, DummyClassifier),
        },
        "recommendation_model": {
            "type": type(recommendation_model).__name__ if recommendation_model else None,
            "trained": recommendation_model is not None,
            "is_fallback": isinstance(recommendation_model, DummyClassifier),
        },
        "label_classes": list(label_encoder.classes_) if hasattr(label_encoder, "classes_") else [],
        "training_samples": len(students_db),
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
