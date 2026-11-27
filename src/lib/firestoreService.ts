import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './firebase';
import type {
  ModelType,
  ScreeningRecord,
  ScreeningResult,
  ThemeMode,
  UserPrivateInfo,
  UserProfile,
} from '../types/screening';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

export async function ensureUserProfile(user: User, preferredTheme: ThemeMode): Promise<UserProfile> {
  const uid = user.uid;
  const profilePath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  let profile: UserProfile | null = null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const data = snap.data();
      profile = {
        uid,
        displayName: String(data.displayName || 'Member'),
        saveHistoryConsent: Boolean(data.saveHistoryConsent),
        preferredModel:
          data.preferredModel === 'random_forest' ? 'random_forest' : 'logistic_regression',
        theme: data.theme === 'dark' ? 'dark' : 'light',
      };
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, profilePath);
  }

  if (!profile) {
    const fallbackName =
      user.displayName ||
      (user.phoneNumber ? `Member ${user.phoneNumber.slice(-4)}` : null) ||
      (user.email ? user.email.split('@')[0] : 'Member');

    const newProfile = {
      uid,
      displayName: clampString(fallbackName, 80) || 'Member',
      saveHistoryConsent: false,
      preferredModel: 'logistic_regression' as ModelType,
      theme: preferredTheme,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'users', uid), newProfile);
      profile = {
        uid,
        displayName: newProfile.displayName,
        saveHistoryConsent: false,
        preferredModel: 'logistic_regression',
        theme: preferredTheme,
      };
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, profilePath);
    }
  }

  // Sync isolated PII document strictly under users/{uid}/private/info
  const providerId = user.providerData[0]?.providerId;
  const authProvider: UserPrivateInfo['authProvider'] =
    providerId === 'phone' || user.phoneNumber
      ? 'phone'
      : providerId === 'google.com'
        ? 'google.com'
        : 'password';

  try {
    await setDoc(doc(db, 'users', uid, 'private', 'info'), {
      uid,
      email: clampString(user.email || '', 160),
      phoneNumber: clampString(user.phoneNumber || '', 32),
      authProvider,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, privatePath);
  }

  return profile;
}

export async function updateUserPreference(
  uid: string,
  patch:
    | { saveHistoryConsent: boolean }
    | { preferredModel: ModelType }
    | { theme: ThemeMode }
    | { displayName: string }
): Promise<void> {
  const path = `users/${uid}`;
  const cleanPatch =
    'displayName' in patch
      ? { displayName: clampString(patch.displayName, 80) || 'Member' }
      : patch;

  try {
    await updateDoc(doc(db, 'users', uid), {
      ...cleanPatch,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function saveScreeningToHistory(
  uid: string,
  result: ScreeningResult
): Promise<ScreeningRecord> {
  const screeningId = sanitizeId(`scr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const path = `users/${uid}/screenings/${screeningId}`;

  const topFactors = result.topFactors
    .slice(0, 4)
    .map((f) => clampString(f, 120))
    .filter(Boolean);

  if (topFactors.length === 0) {
    topFactors.push(`Blood glucose (${result.inputs.glucose.toFixed(0)} mg/dL)`);
  }

  const payload: Record<string, unknown> = {
    id: screeningId,
    uid,
    age: Math.min(120, Math.max(18, Number(result.inputs.age))),
    glucose: Math.min(600, Math.max(40, Number(result.inputs.glucose))),
    bmi: Math.min(80, Math.max(10, Number(result.inputs.bmi))),
    bloodPressure: Math.min(250, Math.max(40, Number(result.inputs.bloodPressure))),
    modelName: result.modelName,
    modelMode: result.modelMode,
    riskCategory: result.riskCategory,
    isCalibrated: Boolean(result.isCalibrated),
    glucoseContribution: Number(result.contributions.glucose),
    bmiContribution: Number(result.contributions.bmi),
    ageContribution: Number(result.contributions.age),
    bpContribution: Number(result.contributions.bloodPressure),
    topFactors,
    explanation: clampString(result.explanation, 1000),
    recommendation: clampString(result.recommendation, 1000),
    createdAt: serverTimestamp(),
  };

  if (result.isCalibrated && typeof result.calibratedProbability === 'number') {
    payload.calibratedProbability = Math.min(1, Math.max(0, result.calibratedProbability));
  }

  try {
    await setDoc(doc(db, 'users', uid, 'screenings', screeningId), payload);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }

  return {
    id: screeningId,
    uid,
    age: Number(payload.age),
    glucose: Number(payload.glucose),
    bmi: Number(payload.bmi),
    bloodPressure: Number(payload.bloodPressure),
    modelName: result.modelName,
    modelMode: result.modelMode,
    riskCategory: result.riskCategory,
    isCalibrated: Boolean(result.isCalibrated),
    calibratedProbability:
      typeof payload.calibratedProbability === 'number' ? payload.calibratedProbability : undefined,
    glucoseContribution: Number(payload.glucoseContribution),
    bmiContribution: Number(payload.bmiContribution),
    ageContribution: Number(payload.ageContribution),
    bpContribution: Number(payload.bpContribution),
    topFactors,
    explanation: String(payload.explanation),
    recommendation: String(payload.recommendation),
    createdAtMs: Date.now(),
  };
}

export async function fetchUserScreenings(uid: string): Promise<ScreeningRecord[]> {
  const path = `users/${uid}/screenings`;
  try {
    const q = query(
      collection(db, 'users', uid, 'screenings'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      const ts = data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
      return {
        id: String(data.id || d.id),
        uid: String(data.uid),
        age: Number(data.age),
        glucose: Number(data.glucose),
        bmi: Number(data.bmi),
        bloodPressure: Number(data.bloodPressure),
        modelName: data.modelName,
        modelMode: data.modelMode,
        riskCategory: data.riskCategory,
        isCalibrated: Boolean(data.isCalibrated),
        calibratedProbability:
          typeof data.calibratedProbability === 'number' ? data.calibratedProbability : undefined,
        glucoseContribution: Number(data.glucoseContribution),
        bmiContribution: Number(data.bmiContribution),
        ageContribution: Number(data.ageContribution),
        bpContribution: Number(data.bpContribution),
        topFactors: Array.isArray(data.topFactors) ? data.topFactors.map(String) : [],
        explanation: String(data.explanation || ''),
        recommendation: String(data.recommendation || ''),
        createdAtMs: ts,
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteSingleScreening(uid: string, screeningId: string): Promise<void> {
  const path = `users/${uid}/screenings/${screeningId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'screenings', screeningId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function deleteAllUserData(uid: string): Promise<void> {
  const screeningsPath = `users/${uid}/screenings`;
  try {
    const q = query(collection(db, 'users', uid, 'screenings'), where('uid', '==', uid));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    batch.delete(doc(db, 'users', uid, 'private', 'info'));
    batch.delete(doc(db, 'users', uid));
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, screeningsPath);
  }
}
