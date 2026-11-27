# Diabetes Risk Screening Assistant — Setup & Android APK Packaging Guide

## 1. Project Folder Structure
- `src/` — Mobile-first React + TypeScript + Tailwind CSS frontend (Vite)
- `server.ts` — Express API gateway (serves Vite/React + proxies or executes reference screening models on port 3000)
- `backend/` — Python FastAPI + Scikit-learn + Pandas + NumPy ML backend
  - `backend/ml/download_dataset.py` — Downloads & verifies the Pima Indians Diabetes Dataset
  - `backend/ml/train_models.py` — Preprocesses missing zero values, trains & calibrates Logistic Regression & Random Forest models, evaluates ROC-AUC/Accuracy/Brier score, exports `.joblib` artifacts
  - `backend/app/auth.py` — Firebase ID token & bcrypt/JWT authentication helpers
  - `backend/app/validation.py` — Strict Pydantic input validation (Age, Glucose, BMI, Blood Pressure only)
  - `backend/app/ml_predictor.py` — Scikit-learn `.joblib` inference engine
  - `backend/app/result_processor.py` — Non-diagnostic risk category mapping & explanation builder
  - `backend/app/database.py` — Fernet-encrypted SQLite storage with explicit consent & full deletion
  - `backend/app/main.py` — FastAPI REST endpoints (`/api/health`, `/api/model-info`, `/api/screenings/predict`, `/api/screenings/save`, `/api/screenings/history`, `/api/account`)
- `firebase-blueprint.json` & `firestore.rules` — Owner-scoped Firestore schema & hardened security rules
- `capacitor.config.ts` — Capacitor Android APK packaging configuration

---

## 2. Dataset & Python Machine Learning Setup
1. Create a Python 3.11+ virtual environment:
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Download the Pima Indians Diabetes Dataset and train the calibrated Scikit-learn models:
   ```bash
   python ml/download_dataset.py
   python ml/train_models.py
   ```
   This saves `backend/models/logistic_regression.joblib`, `backend/models/random_forest.joblib`, and `backend/models/model_metadata.json`.
3. Start the Python FastAPI backend:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
4. To connect the Node.js gateway to the running Python FastAPI server, set `PYTHON_BACKEND_URL=http://127.0.0.1:8000` (or your HTTPS FastAPI deployment URL) in your environment variables.

---

## 3. Firebase Authentication Setup (Phone OTP & Email/Password)
- Google Sign-In is ready immediately after provisioning.
- To enable **Phone Number OTP Verification** in production and on Android:
  1. Open Firebase Console -> **Authentication** -> **Sign-in method**.
  2. Enable **Phone** (and optionally **Email/Password**).
  3. Under **Authorized domains**, ensure your web domain and `localhost` are listed.
  4. For Android APK builds, add your app's SHA-1 and SHA-256 fingerprints in Firebase Project Settings so Phone Auth Play Integrity / SafetyNet verification succeeds.

---

## 4. Packaging as an Android APK (Capacitor + Android Studio)
Prerequisites: Node.js 20+, JDK 17+, and Android Studio (with Android SDK Platform 34+ installed).

1. Configure your deployed HTTPS backend URL in `.env` before building the mobile bundle:
   ```env
   VITE_API_BASE_URL=https://your-deployed-backend-domain.com
   ```
2. Build the production React bundle:
   ```bash
   npm run build
   ```
3. Add the Android native project (first time only):
   ```bash
   npx cap add android
   ```
4. Sync web assets and Capacitor configuration into Android Studio:
   ```bash
   npx cap sync android
   ```
5. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
6. Inside Android Studio:
   - Wait for Gradle sync to finish.
   - To test on a device/emulator: click **Run ('app')**.
   - To build a distributable APK: **Build -> Build Bundle(s) / APK(s) -> Build APK(s)** (debug) or **Build -> Generate Signed Bundle / APK** (release keystore for Play Store / sideloading).
