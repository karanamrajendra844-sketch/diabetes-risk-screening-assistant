"""
FastAPI entrypoint for the Diabetes Risk Screening Assistant backend.
Run with: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from __future__ import annotations

import os
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .auth import init_firebase_admin, verify_bearer_token
from .database import DatabaseManager
from .ml_predictor import DiabetesMLPredictor
from .validation import ScreeningInput

init_firebase_admin()

app = FastAPI(
    title="Diabetes Risk Screening Assistant API",
    version="1.0.0",
    description="Educational preliminary diabetes risk screening backend powered by Scikit-learn.",
)

allowed_origins = os.getenv(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:3000,http://localhost:5173,capacitor://localhost,https://localhost",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

predictor = DiabetesMLPredictor()
db = DatabaseManager()


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {
        "status": "ok",
        "modelMode": "validated_sklearn" if predictor.is_validated_ready else "demonstration",
    }


@app.get("/api/model-info")
def model_info() -> dict:
    return predictor.get_model_info()


@app.post("/api/screenings/predict")
def predict_screening(payload: ScreeningInput) -> dict:
    result = predictor.predict(
        age=payload.age,
        glucose=payload.glucose,
        bmi=payload.bmi,
        blood_pressure=payload.blood_pressure,
        model_type=payload.model_type,
    )
    result["inputs"] = {
        "age": payload.age,
        "glucose": payload.glucose,
        "bmi": payload.bmi,
        "bloodPressure": payload.blood_pressure,
    }
    return result


@app.post("/api/screenings/save")
def save_screening_endpoint(
    payload: ScreeningInput,
    user: dict = Depends(verify_bearer_token),
) -> dict:
    if not payload.save_to_history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit user consent (saveToHistory=true) is required before saving screening data.",
        )

    result = predictor.predict(
        age=payload.age,
        glucose=payload.glucose,
        bmi=payload.bmi,
        blood_pressure=payload.blood_pressure,
        model_type=payload.model_type,
    )
    result["inputs"] = {
        "age": payload.age,
        "glucose": payload.glucose,
        "bmi": payload.bmi,
        "bloodPressure": payload.blood_pressure,
    }

    contact = user.get("email") or user.get("phone_number") or user["uid"]
    db.upsert_user_consent(user["uid"], contact, True)
    saved_id = db.save_screening(user["uid"], result)
    return {"savedId": saved_id, "result": result}


@app.get("/api/screenings/history")
def get_history(user: dict = Depends(verify_bearer_token)) -> dict:
    return {"screenings": db.get_user_history(user["uid"])}


@app.delete("/api/account")
def delete_account_data(user: dict = Depends(verify_bearer_token)) -> dict:
    db.delete_user_and_data(user["uid"])
    return {"deleted": True, "uid": user["uid"]}
