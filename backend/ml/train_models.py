"""
Machine Learning training and evaluation pipeline for Diabetes Risk Screening Assistant.
Trains calibrated Logistic Regression and Random Forest Classifier models strictly on
the 4 screening features: Age, Glucose, BMI, BloodPressure.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from download_dataset import DATASET_PATH, download_and_verify

BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
FEATURES = ["Age", "Glucose", "BMI", "BloodPressure"]
ZERO_AS_MISSING_FEATURES = ["Glucose", "BloodPressure", "BMI"]


def load_and_preprocess(csv_path: Path) -> tuple[pd.DataFrame, pd.Series]:
    df = pd.read_csv(csv_path)
    required = FEATURES + ["Outcome"]
    missing_cols = [c for c in required if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Dataset is missing required columns: {missing_cols}")

    X = df[FEATURES].copy()
    y = df["Outcome"].astype(int)

    # Physiologically impossible zero readings in Pima dataset represent missing values
    for col in ZERO_AS_MISSING_FEATURES:
        X.loc[X[col] <= 0, col] = np.nan

    return X, y


def evaluate_model(model, X_test: pd.DataFrame, y_test: pd.Series) -> dict[str, float]:
    y_prob = model.predict_proba(X_test)[:, 1]
    y_pred = (y_prob >= 0.5).astype(int)
    return {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1_score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "brier_score": round(float(brier_score_loss(y_test, y_prob)), 4),
    }


def train_and_export() -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    csv_path = DATASET_PATH if DATASET_PATH.exists() else download_and_verify()

    X, y = load_and_preprocess(csv_path)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Compute training medians and standard deviations for interpretability
    feature_stats = {}
    for col in FEATURES:
        col_clean = X_train[col].dropna()
        feature_stats[col] = {
            "median": round(float(col_clean.median()), 4),
            "mean": round(float(col_clean.mean()), 4),
            "std": round(float(col_clean.std(ddof=0)), 4),
        }

    # 1. Calibrated Logistic Regression Pipeline
    lr_base = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(max_iter=1000, C=1.0, random_state=42)),
        ]
    )
    lr_calibrated = CalibratedClassifierCV(estimator=lr_base, method="sigmoid", cv=5)
    lr_calibrated.fit(X_train, y_train)
    lr_metrics = evaluate_model(lr_calibrated, X_test, y_test)

    # Fit uncalibrated pipeline on full train split for coefficient interpretability
    lr_base.fit(X_train, y_train)
    lr_coefs = {
        feat: round(float(coef), 4)
        for feat, coef in zip(FEATURES, lr_base.named_steps["classifier"].coef_[0])
    }

    # 2. Calibrated Random Forest Classifier Pipeline
    rf_base = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=250,
                    max_depth=6,
                    min_samples_leaf=5,
                    random_state=42,
                ),
            ),
        ]
    )
    rf_calibrated = CalibratedClassifierCV(estimator=rf_base, method="isotonic", cv=5)
    rf_calibrated.fit(X_train, y_train)
    rf_metrics = evaluate_model(rf_calibrated, X_test, y_test)

    rf_base.fit(X_train, y_train)
    rf_importances = {
        feat: round(float(imp), 4)
        for feat, imp in zip(FEATURES, rf_base.named_steps["classifier"].feature_importances_)
    }

    joblib.dump(lr_calibrated, MODELS_DIR / "logistic_regression.joblib")
    joblib.dump(rf_calibrated, MODELS_DIR / "random_forest.joblib")

    metadata = {
        "dataset": "Pima Indians Diabetes Dataset (NIDDK)",
        "features": FEATURES,
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "calibrated": True,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "feature_stats": feature_stats,
        "models": {
            "logistic_regression": {
                "display_name": "Logistic Regression",
                "calibration_method": "Platt Sigmoid (5-fold CV)",
                "metrics": lr_metrics,
                "coefficients": lr_coefs,
            },
            "random_forest": {
                "display_name": "Random Forest Classifier",
                "calibration_method": "Isotonic Regression (5-fold CV)",
                "metrics": rf_metrics,
                "feature_importances": rf_importances,
            },
        },
    }

    with open(MODELS_DIR / "model_metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("Training complete. Model evaluation metrics:")
    print(json.dumps(metadata["models"], indent=2))


if __name__ == "__main__":
    train_and_export()
