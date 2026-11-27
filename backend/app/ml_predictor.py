"""
Machine Learning prediction module.
Loads validated Scikit-learn pipelines from backend/models/*.joblib.
If trained artifacts are unavailable, transparently executes a deterministic
reference scoring fallback labeled strictly as 'demonstration' with isCalibrated=False.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

from .result_processor import process_prediction_result

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
LR_PATH = MODELS_DIR / "logistic_regression.joblib"
RF_PATH = MODELS_DIR / "random_forest.joblib"
META_PATH = MODELS_DIR / "model_metadata.json"


class DiabetesMLPredictor:
    def __init__(self) -> None:
        self.lr_model = None
        self.rf_model = None
        self.metadata: dict[str, Any] = {}
        self.load_models()

    def load_models(self) -> None:
        if LR_PATH.exists() and RF_PATH.exists() and META_PATH.exists():
            self.lr_model = joblib.load(LR_PATH)
            self.rf_model = joblib.load(RF_PATH)
            with open(META_PATH, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

    @property
    def is_validated_ready(self) -> bool:
        return self.lr_model is not None and self.rf_model is not None

    def get_model_info(self) -> dict[str, Any]:
        if self.is_validated_ready:
            return {
                "modelMode": "validated_sklearn",
                "isCalibrated": bool(self.metadata.get("calibrated", True)),
                "dataset": self.metadata.get("dataset", "Pima Indians Diabetes Dataset"),
                "trainedAt": self.metadata.get("trained_at"),
                "models": self.metadata.get("models", {}),
            }
        return {
            "modelMode": "demonstration",
            "isCalibrated": False,
            "dataset": "Reference epidemiological demonstration parameters (train backend/ml/train_models.py to activate validated Scikit-learn models)",
            "trainedAt": None,
            "models": {
                "logistic_regression": {"display_name": "Logistic Regression"},
                "random_forest": {"display_name": "Random Forest Classifier"},
            },
        }

    def _compute_contributions(
        self, age: float, glucose: float, bmi: float, blood_pressure: float, model_type: str
    ) -> dict[str, float]:
        stats = self.metadata.get(
            "feature_stats",
            {
                "Glucose": {"mean": 121.6, "std": 30.5},
                "BMI": {"mean": 32.4, "std": 6.9},
                "Age": {"mean": 33.2, "std": 11.8},
                "BloodPressure": {"mean": 72.4, "std": 12.1},
            },
        )
        z_glucose = (glucose - stats["Glucose"]["mean"]) / max(stats["Glucose"]["std"], 1e-6)
        z_bmi = (bmi - stats["BMI"]["mean"]) / max(stats["BMI"]["std"], 1e-6)
        z_age = (age - stats["Age"]["mean"]) / max(stats["Age"]["std"], 1e-6)
        z_bp = (blood_pressure - stats["BloodPressure"]["mean"]) / max(stats["BloodPressure"]["std"], 1e-6)

        if model_type == "logistic_regression":
            coefs = (
                self.metadata.get("models", {})
                .get("logistic_regression", {})
                .get("coefficients", {"Glucose": 1.12, "BMI": 0.62, "Age": 0.38, "BloodPressure": 0.08})
            )
            raw = {
                "glucose": z_glucose * coefs["Glucose"],
                "bmi": z_bmi * coefs["BMI"],
                "age": z_age * coefs["Age"],
                "bloodPressure": z_bp * coefs["BloodPressure"],
            }
        else:
            imps = (
                self.metadata.get("models", {})
                .get("random_forest", {})
                .get("feature_importances", {"Glucose": 0.46, "BMI": 0.25, "Age": 0.18, "BloodPressure": 0.11})
            )
            raw = {
                "glucose": max(0.0, z_glucose) * imps["Glucose"] * 2.0 + z_glucose * 0.2,
                "bmi": max(0.0, z_bmi) * imps["BMI"] * 2.0 + z_bmi * 0.15,
                "age": max(0.0, z_age) * imps["Age"] * 2.0 + z_age * 0.1,
                "bloodPressure": max(0.0, z_bp) * imps["BloodPressure"] * 2.0 + z_bp * 0.05,
            }

        total_abs = sum(abs(v) for v in raw.values()) or 1.0
        return {k: (v / total_abs) * 100.0 for k, v in raw.items()}

    def predict(
        self,
        *,
        age: float,
        glucose: float,
        bmi: float,
        blood_pressure: float,
        model_type: str,
    ) -> dict[str, Any]:
        inputs = {
            "age": age,
            "glucose": glucose,
            "bmi": bmi,
            "bloodPressure": blood_pressure,
        }
        contributions = self._compute_contributions(age, glucose, bmi, blood_pressure, model_type)

        if self.is_validated_ready:
            frame = pd.DataFrame(
                [{"Age": age, "Glucose": glucose, "BMI": bmi, "BloodPressure": blood_pressure}]
            )
            if model_type == "random_forest":
                prob = float(self.rf_model.predict_proba(frame)[0][1])
                model_name = "Random Forest Classifier"
                metrics = self.metadata.get("models", {}).get("random_forest", {}).get("metrics")
            else:
                prob = float(self.lr_model.predict_proba(frame)[0][1])
                model_name = "Logistic Regression"
                metrics = self.metadata.get("models", {}).get("logistic_regression", {}).get("metrics")

            return process_prediction_result(
                raw_probability=prob,
                model_name=model_name,
                model_mode="validated_sklearn",
                is_calibrated=True,
                contributions=contributions,
                inputs=inputs,
                metrics=metrics,
            )

        # Deterministic demonstration scoring when .joblib artifacts have not been trained yet
        z_g = (glucose - 115.0) / 30.0
        z_b = (bmi - 27.5) / 6.5
        z_a = (age - 38.0) / 12.0
        z_bp = (blood_pressure - 74.0) / 12.0

        if model_type == "random_forest":
            score = 0.0
            score += 0.45 if glucose >= 140 else (0.22 if glucose >= 110 else 0.05)
            score += 0.25 if bmi >= 30 else (0.12 if bmi >= 25 else 0.04)
            score += 0.18 if age >= 45 else (0.09 if age >= 35 else 0.03)
            score += 0.12 if blood_pressure >= 90 else (0.06 if blood_pressure >= 80 else 0.02)
            model_name = "Random Forest Classifier"
        else:
            logit = -1.15 + 1.18 * z_g + 0.64 * z_b + 0.40 * z_a + 0.12 * z_bp
            score = 1.0 / (1.0 + math.exp(-logit))
            model_name = "Logistic Regression"

        return process_prediction_result(
            raw_probability=score,
            model_name=model_name,
            model_mode="demonstration",
            is_calibrated=False,
            contributions=contributions,
            inputs=inputs,
            metrics=None,
        )
