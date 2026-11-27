"""
Strict health input validation module.
Collects ONLY Age, Blood Glucose, BMI, and Blood Pressure.
"""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class ScreeningInput(BaseModel):

    age: float = Field(
        ...,
        ge=18,
        le=120,
        description="Age in years (18 to 120).",
    )
    glucose: float = Field(
        ...,
        ge=40,
        le=600,
        description="Blood glucose level in mg/dL (40 to 600).",
    )
    bmi: float = Field(
        ...,
        ge=10,
        le=80,
        description="Body Mass Index in kg/m² (10 to 80).",
    )
    blood_pressure: float = Field(
        ...,
        ge=40,
        le=250,
        alias="bloodPressure",
        description="Resting diastolic blood pressure in mmHg (40 to 250).",
    )
    model_type: Literal["logistic_regression", "random_forest"] = Field(
        default="logistic_regression",
        alias="modelType",
        description="Selected ML screening model.",
    )
    save_to_history: bool = Field(
        default=False,
        alias="saveToHistory",
        description="Explicit user consent to persist this screening result.",
    )

    model_config = ConfigDict(extra="forbid", populate_by_name=True)
