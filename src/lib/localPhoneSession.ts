import type {
  ModelType,
  ScreeningRecord,
  ScreeningResult,
  ThemeMode,
  UserProfile,
} from '../types/screening';

export interface PhoneSession {
  uid: string;
  phoneNumber: string;
  displayName: string;
}

const SESSION_KEY = 'drsa_phone_session';
const profileKey = (uid: string) => `drsa_phone_profile_${uid}`;
const recordsKey = (uid: string) => `drsa_phone_records_${uid}`;

function phoneToUid(phoneNumber: string): string {
  const digits = phoneNumber.replace(/\D/g, '');
  return `phone_${digits || 'member'}`;
}

export function getActivePhoneSession(): PhoneSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PhoneSession>;
    if (!parsed.uid || !parsed.phoneNumber) return null;
    return {
      uid: String(parsed.uid),
      phoneNumber: String(parsed.phoneNumber),
      displayName: String(parsed.displayName || `Member ${String(parsed.phoneNumber).slice(-4)}`),
    };
  } catch {
    return null;
  }
}

export function loadPhoneProfile(uid: string, phoneNumber: string, preferredTheme: ThemeMode): UserProfile {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(profileKey(uid));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<UserProfile>;
        return {
          uid,
          displayName: String(parsed.displayName || `Member ${phoneNumber.slice(-4)}`),
          saveHistoryConsent: Boolean(parsed.saveHistoryConsent),
          preferredModel:
            parsed.preferredModel === 'random_forest' ? 'random_forest' : 'logistic_regression',
          theme: parsed.theme === 'dark' ? 'dark' : 'light',
        };
      }
    } catch {
      // Fall back to default profile
    }
  }

  const fallback: UserProfile = {
    uid,
    displayName: `Member ${phoneNumber.slice(-4)}`,
    saveHistoryConsent: false,
    preferredModel: 'logistic_regression',
    theme: preferredTheme,
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(profileKey(uid), JSON.stringify(fallback));
  }
  return fallback;
}

export function createPhoneSession(
  phoneNumber: string,
  preferredTheme: ThemeMode
): { session: PhoneSession; profile: UserProfile } {
  const uid = phoneToUid(phoneNumber);
  const profile = loadPhoneProfile(uid, phoneNumber, preferredTheme);
  const session: PhoneSession = {
    uid,
    phoneNumber,
    displayName: profile.displayName,
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  return { session, profile };
}

export function clearPhoneSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function updatePhonePreference(
  uid: string,
  phoneNumber: string,
  currentTheme: ThemeMode,
  patch:
    | { saveHistoryConsent: boolean }
    | { preferredModel: ModelType }
    | { theme: ThemeMode }
    | { displayName: string }
): UserProfile {
  const current = loadPhoneProfile(uid, phoneNumber, currentTheme);
  const updated: UserProfile = {
    ...current,
    ...patch,
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(profileKey(uid), JSON.stringify(updated));
  }
  return updated;
}

export function loadPhoneScreenings(uid: string): ScreeningRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(recordsKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScreeningRecord[]) : [];
  } catch {
    return [];
  }
}

export function savePhoneScreening(uid: string, result: ScreeningResult): ScreeningRecord {
  const id = `scr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const record: ScreeningRecord = {
    id,
    uid,
    age: result.inputs.age,
    glucose: result.inputs.glucose,
    bmi: result.inputs.bmi,
    bloodPressure: result.inputs.bloodPressure,
    modelName: result.modelName,
    modelMode: result.modelMode,
    riskCategory: result.riskCategory,
    isCalibrated: result.isCalibrated,
    calibratedProbability:
      typeof result.calibratedProbability === 'number' ? result.calibratedProbability : undefined,
    glucoseContribution: result.contributions.glucose,
    bmiContribution: result.contributions.bmi,
    ageContribution: result.contributions.age,
    bpContribution: result.contributions.bloodPressure,
    topFactors: result.topFactors,
    explanation: result.explanation,
    recommendation: result.recommendation,
    createdAtMs: Date.now(),
  };

  if (typeof window !== 'undefined') {
    const existing = loadPhoneScreenings(uid);
    window.localStorage.setItem(recordsKey(uid), JSON.stringify([record, ...existing]));
  }
  return record;
}

export function deletePhoneScreening(uid: string, screeningId: string): void {
  if (typeof window === 'undefined') return;
  const existing = loadPhoneScreenings(uid);
  window.localStorage.setItem(
    recordsKey(uid),
    JSON.stringify(existing.filter((item) => item.id !== screeningId))
  );
}

export function deleteAllPhoneData(uid: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(recordsKey(uid));
  window.localStorage.removeItem(profileKey(uid));
  window.localStorage.removeItem(SESSION_KEY);
}
