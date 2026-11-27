"""
Result processing module: converts model probability and feature contributions into
non-diagnostic risk categories, understandable explanations, and care guidance.
"""

from __future__ import annotations

from typing import Any


def classify_risk(probability: float) -> str:
    if probability < 0.30:
        return "Lower estimated risk"
    if probability < 0.60:
        return "Elevated estimated risk"
    return "Higher estimated risk"


def build_explanation_and_recommendation(
    risk_category: str,
    age: float,
    glucose: float,
    bmi: float,
    blood_pressure: float,
    top_factors: list[str],
    model_mode: str,
) -> tuple[str, str]:
    factor_summary = ", ".join(top_factors[:2]) if top_factors else "your recorded measurements"
    mode_note = (
        "This preliminary screening estimate was generated using a calibrated Scikit-learn model."
        if model_mode == "validated_sklearn"
        else "This result is a preliminary demonstration estimate (connect the trained Scikit-learn model artifacts for validated model probabilities)."
    )

    if risk_category == "Lower estimated risk":
        explanation = (
            f"{mode_note} Based on your measurements (glucose {glucose:.0f} mg/dL, BMI {bmi:.1f} kg/m², "
            f"blood pressure {blood_pressure:.0f} mmHg, age {age:.0f} years), your pattern aligns with the "
            f"lower-risk reference group. Key signals evaluated included {factor_summary}."
        )
        recommendation = (
            "Continue routine preventive checkups, balanced nutrition, and regular physical activity. "
            "If you experience symptoms or have family history risk factors, discuss routine lab testing with a healthcare professional."
        )
    elif risk_category == "Elevated estimated risk":
        explanation = (
            f"{mode_note} Your profile shows moderate metabolic indicators associated with elevated preliminary risk, "
            f"driven primarily by {factor_summary}. This screening tool does not diagnose diabetes."
        )
        recommendation = (
            "Consider scheduling a preventive primary care visit to discuss standardized lab screening such as HbA1c "
            "or fasting plasma glucose, alongside sustainable nutrition and activity habits."
        )
    else:
        explanation = (
            f"{mode_note} Several of your measurements—most notably {factor_summary}—fall in a range strongly "
            f"associated with higher screening risk in the reference dataset. Only clinical lab testing can diagnose diabetes."
        )
        recommendation = (
            "We recommend consulting a qualified healthcare professional promptly for formal laboratory evaluation "
            "(such as fasting blood glucose or HbA1c) and personalized medical guidance."
        )

    return explanation, recommendation


def process_prediction_result(
    *,
    raw_probability: float,
    model_name: str,
    model_mode: str,
    is_calibrated: bool,
    contributions: dict[str, float],
    inputs: dict[str, float],
    metrics: dict[str, Any] | None = None,
) -> dict[str, Any]:
    risk_category = classify_risk(raw_probability)

    sorted_factors = sorted(
        contributions.items(),
        key=lambda item: abs(item[1]),
        reverse=True,
    )
    label_map = {
        "glucose": f"Blood glucose ({inputs['glucose']:.0f} mg/dL)",
        "bmi": f"Body Mass Index ({inputs['bmi']:.1f} kg/m²)",
        "age": f"Age ({inputs['age']:.0f} years)",
        "bloodPressure": f"Blood pressure ({inputs['bloodPressure']:.0f} mmHg)",
    }
    top_factors = [label_map[k] for k, _ in sorted_factors]

    explanation, recommendation = build_explanation_and_recommendation(
        risk_category=risk_category,
        age=inputs["age"],
        glucose=inputs["glucose"],
        bmi=inputs["bmi"],
        blood_pressure=inputs["bloodPressure"],
        top_factors=top_factors,
        model_mode=model_mode,
    )

    return {
        "riskCategory": risk_category,
        "riskPercentage": min(99, max(1, round(raw_probability * 100))),
        "modelName": model_name,
        "modelMode": model_mode,
        "isCalibrated": is_calibrated,
        "calibratedProbability": round(raw_probability, 4) if is_calibrated else None,
        "contributions": {
            "glucose": round(contributions["glucose"], 2),
            "bmi": round(contributions["bmi"], 2),
            "age": round(contributions["age"], 2),
            "bloodPressure": round(contributions["bloodPressure"], 2),
        },
        "topFactors": top_factors,
        "explanation": explanation,
        "recommendation": recommendation,
        "disclaimer": (
            "Educational preliminary screening only. This result does not diagnose diabetes "
            "or replace evaluation by a qualified healthcare professional."
        ),
        "modelMetrics": metrics,
    }
