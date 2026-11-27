"""
Dataset setup utility for the Diabetes Risk Screening Assistant.
Downloads the Pima Indians Diabetes Dataset (NIDDK / UCI) into backend/data/diabetes.csv
and verifies required columns and row integrity.
"""

from pathlib import Path
import urllib.request
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATASET_PATH = DATA_DIR / "diabetes.csv"

# Standard Pima Indians Diabetes Dataset CSV (768 rows, 9 columns)
PIMA_URLS = [
    "https://raw.githubusercontent.com/plotly/datasets/master/diabetes.csv",
    "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv",
]

COLUMNS = [
    "Pregnancies",
    "Glucose",
    "BloodPressure",
    "SkinThickness",
    "Insulin",
    "BMI",
    "DiabetesPedigreeFunction",
    "Age",
    "Outcome",
]


def download_and_verify() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if DATASET_PATH.exists():
        df = pd.read_csv(DATASET_PATH)
        if {"Glucose", "BloodPressure", "BMI", "Age", "Outcome"}.issubset(df.columns):
            print(f"Verified existing dataset at {DATASET_PATH} ({len(df)} rows).")
            return DATASET_PATH

    for url in PIMA_URLS:
        try:
            print(f"Downloading dataset from {url} ...")
            urllib.request.urlretrieve(url, DATASET_PATH)
            df = pd.read_csv(DATASET_PATH)
            if list(df.columns) != COLUMNS and len(df.columns) == len(COLUMNS):
                # Headerless CSV fallback
                df = pd.read_csv(DATASET_PATH, header=None, names=COLUMNS)
                df.to_csv(DATASET_PATH, index=False)
            assert {"Glucose", "BloodPressure", "BMI", "Age", "Outcome"}.issubset(df.columns)
            print(f"Dataset saved and verified at {DATASET_PATH} ({len(df)} rows).")
            return DATASET_PATH
        except Exception as exc:
            print(f"Source failed ({url}): {exc}")

    raise RuntimeError(
        "Could not download dataset automatically. Place diabetes.csv with columns "
        "Glucose, BloodPressure, BMI, Age, Outcome into backend/data/diabetes.csv."
    )


if __name__ == "__main__":
    download_and_verify()
