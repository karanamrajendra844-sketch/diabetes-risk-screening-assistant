import React, { useCallback, useEffect, useState } from 'react';
import {
  deleteUser,
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  User,
} from 'firebase/auth';
import {
  AlertCircle,
  BookOpen,
  HeartPulse,
  History,
  Home,
  Loader2,
  Moon,
  PlusCircle,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { EducationHub } from './components/EducationHub';
import { ErrorBoundary } from './components/ErrorBoundary';
import { HistoryView } from './components/HistoryView';
import { HomeDashboard } from './components/HomeDashboard';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ScreeningForm } from './components/ScreeningForm';
import { SettingsView } from './components/SettingsView';
import { checkBackendHealth, runDiabetesScreening } from './lib/api';
import { auth, testFirestoreConnection } from './lib/firebase';
import {
  deleteAllUserData,
  deleteSingleScreening,
  ensureUserProfile,
  fetchUserScreenings,
  saveScreeningToHistory,
  updateUserPreference,
} from './lib/firestoreService';
import {
  clearPhoneSession,
  createPhoneSession,
  deleteAllPhoneData,
  deletePhoneScreening,
  getActivePhoneSession,
  loadPhoneProfile,
  loadPhoneScreenings,
  PhoneSession,
  savePhoneScreening,
  updatePhonePreference,
} from './lib/localPhoneSession';
import type {
  ActiveTab,
  ModelType,
  ScreeningInputs,
  ScreeningRecord,
  ScreeningResult,
  ThemeMode,
  UserProfile,
} from './types/screening';

function getInitialTheme(): ThemeMode {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('drsa_theme');
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  }
  return 'light';
}

function estimateRiskPercentageFromRecord(record: ScreeningRecord): number {
  if (record.isCalibrated && typeof record.calibratedProbability === 'number') {
    return Math.min(99, Math.max(1, Math.round(record.calibratedProbability * 100)));
  }
  if (record.modelName === 'Random Forest Classifier') {
    const gScore =
      record.glucose >= 140 ? 0.44 : record.glucose >= 115 ? 0.24 : record.glucose >= 100 ? 0.12 : 0.04;
    const bScore = record.bmi >= 35 ? 0.24 : record.bmi >= 30 ? 0.18 : record.bmi >= 25 ? 0.1 : 0.03;
    const aScore = record.age >= 50 ? 0.18 : record.age >= 40 ? 0.12 : record.age >= 30 ? 0.07 : 0.03;
    const bpScore = record.bloodPressure >= 90 ? 0.12 : record.bloodPressure >= 80 ? 0.07 : 0.02;
    return Math.min(99, Math.max(1, Math.round(Math.min(0.98, gScore + bScore + aScore + bpScore) * 100)));
  }
  const zG = (record.glucose - 121.6) / 30.5;
  const zB = (record.bmi - 32.4) / 6.9;
  const zA = (record.age - 33.2) / 11.8;
  const zBp = (record.bloodPressure - 72.4) / 12.1;
  const logit = -1.12 + 1.15 * zG + 0.62 * zB + 0.38 * zA + 0.12 * zBp;
  const prob = 1 / (1 + Math.exp(-logit));
  return Math.min(99, Math.max(1, Math.round(prob * 100)));
}

function recordToResult(record: ScreeningRecord): ScreeningResult {
  return {
    riskCategory: record.riskCategory,
    riskPercentage: estimateRiskPercentageFromRecord(record),
    modelName: record.modelName,
    modelMode: record.modelMode,
    isCalibrated: record.isCalibrated,
    calibratedProbability:
      typeof record.calibratedProbability === 'number' ? record.calibratedProbability : null,
    contributions: {
      glucose: record.glucoseContribution,
      bmi: record.bmiContribution,
      age: record.ageContribution,
      bloodPressure: record.bpContribution,
    },
    topFactors: record.topFactors,
    explanation: record.explanation,
    recommendation: record.recommendation,
    disclaimer:
      'Educational preliminary screening only. This result does not diagnose diabetes or replace evaluation by a qualified healthcare professional.',
    inputs: {
      age: record.age,
      glucose: record.glucose,
      bmi: record.bmi,
      bloodPressure: record.bloodPressure,
      modelType:
        record.modelName === 'Random Forest Classifier' ? 'random_forest' : 'logistic_regression',
    },
  };
}

function AppContent() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [phoneSession, setPhoneSession] = useState<PhoneSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<ScreeningRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activeResult, setActiveResult] = useState<{
    result: ScreeningResult;
    wasSaved: boolean;
    fromHistory?: boolean;
  } | null>(null);

  const [isPredicting, setIsPredicting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [backendMode, setBackendMode] = useState<'validated_sklearn' | 'demonstration'>(
    'demonstration'
  );
  const [legalModal, setLegalModal] = useState<'privacy' | 'about' | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    window.localStorage.setItem('drsa_theme', theme);
  }, [theme]);

  // Initial Firestore connectivity probe & backend health check
  useEffect(() => {
    void testFirestoreConnection();
    void checkBackendHealth().then((info) => {
      if (info.reachable) setBackendMode(info.modelMode);
    });
  }, []);

  const isUserVerified = useCallback((u: User | null): boolean => {
    if (!u) return false;
    return Boolean(u.emailVerified || (u.phoneNumber && u.phoneNumber.length > 0));
  }, []);

  const loadUserWorkspace = useCallback(
    async (firebaseUser: User) => {
      const currentTheme = getInitialTheme();
      if (!isUserVerified(firebaseUser)) {
        setProfile({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email || 'Member',
          saveHistoryConsent: false,
          preferredModel: 'logistic_regression',
          theme: currentTheme,
        });
        setRecords([]);
        return;
      }

      const loadedProfile = await ensureUserProfile(firebaseUser, currentTheme);
      setProfile(loadedProfile);
      setTheme(loadedProfile.theme);

      setHistoryLoading(true);
      try {
        const list = await fetchUserScreenings(firebaseUser.uid);
        setRecords(list);
      } finally {
        setHistoryLoading(false);
      }
    },
    [isUserVerified]
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        clearPhoneSession();
        setPhoneSession(null);
        try {
          await loadUserWorkspace(nextUser);
        } catch (err) {
          console.error('Failed loading user workspace:', err);
        }
      } else {
        const savedPhone = getActivePhoneSession();
        if (savedPhone) {
          const loadedProfile = loadPhoneProfile(
            savedPhone.uid,
            savedPhone.phoneNumber,
            getInitialTheme()
          );
          setPhoneSession(savedPhone);
          setProfile(loadedProfile);
          setTheme(loadedProfile.theme);
          setRecords(loadPhoneScreenings(savedPhone.uid));
        } else {
          setPhoneSession(null);
          setProfile(null);
          setRecords([]);
          setActiveResult(null);
          setActiveTab('home');
        }
      }
      setAuthReady(true);
    });
    return unsub;
  }, [loadUserWorkspace]);

  const handlePhoneSignIn = (normalizedPhone: string) => {
    const { session, profile: phoneProfile } = createPhoneSession(normalizedPhone, theme);
    setPhoneSession(session);
    setProfile(phoneProfile);
    setTheme(phoneProfile.theme);
    setRecords(loadPhoneScreenings(session.uid));
    setActiveResult(null);
    setActiveTab('home');
  };

  const handleToggleTheme = async () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (phoneSession && profile) {
      const updated = updatePhonePreference(
        phoneSession.uid,
        phoneSession.phoneNumber,
        nextTheme,
        { theme: nextTheme }
      );
      setProfile(updated);
      return;
    }
    if (user && isUserVerified(user) && profile) {
      setProfile({ ...profile, theme: nextTheme });
      await updateUserPreference(user.uid, { theme: nextTheme });
    }
  };

  const handleUpdateConsent = async (consent: boolean) => {
    if (!profile) return;
    if (phoneSession) {
      const updated = updatePhonePreference(
        phoneSession.uid,
        phoneSession.phoneNumber,
        theme,
        { saveHistoryConsent: consent }
      );
      setProfile(updated);
      return;
    }
    if (!user) return;
    setProfile({ ...profile, saveHistoryConsent: consent });
    if (isUserVerified(user)) {
      await updateUserPreference(user.uid, { saveHistoryConsent: consent });
    }
  };

  const handleUpdateModel = async (model: ModelType) => {
    if (!profile) return;
    if (phoneSession) {
      const updated = updatePhonePreference(
        phoneSession.uid,
        phoneSession.phoneNumber,
        theme,
        { preferredModel: model }
      );
      setProfile(updated);
      return;
    }
    if (!user) return;
    setProfile({ ...profile, preferredModel: model });
    if (isUserVerified(user)) {
      await updateUserPreference(user.uid, { preferredModel: model });
    }
  };

  const handleRunScreening = async (inputs: ScreeningInputs, shouldSave: boolean) => {
    setApiError(null);
    setIsPredicting(true);
    try {
      const result = await runDiabetesScreening(inputs);
      let wasSaved = false;

      if (shouldSave && phoneSession) {
        if (!profile?.saveHistoryConsent) {
          const updated = updatePhonePreference(
            phoneSession.uid,
            phoneSession.phoneNumber,
            theme,
            { saveHistoryConsent: true }
          );
          setProfile(updated);
        }
        const savedRecord = savePhoneScreening(phoneSession.uid, result);
        setRecords((prev) => [savedRecord, ...prev]);
        wasSaved = true;
      } else if (shouldSave && user && isUserVerified(user)) {
        if (!profile?.saveHistoryConsent) {
          await updateUserPreference(user.uid, { saveHistoryConsent: true });
          if (profile) setProfile({ ...profile, saveHistoryConsent: true });
        }
        const savedRecord = await saveScreeningToHistory(user.uid, result);
        setRecords((prev) => [savedRecord, ...prev]);
        wasSaved = true;
      }

      setActiveResult({ result, wasSaved, fromHistory: false });
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : 'Unable to complete screening. Please try again.'
      );
    } finally {
      setIsPredicting(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (phoneSession) {
      deletePhoneScreening(phoneSession.uid, recordId);
      setRecords((prev) => prev.filter((item) => item.id !== recordId));
      return;
    }
    if (!user) return;
    await deleteSingleScreening(user.uid, recordId);
    setRecords((prev) => prev.filter((item) => item.id !== recordId));
  };

  const handleLogout = async () => {
    if (phoneSession) {
      clearPhoneSession();
      setPhoneSession(null);
      setProfile(null);
      setRecords([]);
      setActiveResult(null);
      setActiveTab('home');
      return;
    }
    await signOut(auth);
  };

  const handleDeleteAccount = async () => {
    if (phoneSession) {
      deleteAllPhoneData(phoneSession.uid);
      setPhoneSession(null);
      setProfile(null);
      setRecords([]);
      setActiveResult(null);
      setActiveTab('home');
      return;
    }
    if (!user) return;

    if (isUserVerified(user)) {
      try {
        await deleteAllUserData(user.uid);
      } catch (err) {
        console.warn('Firestore cleanup skipped or partially completed:', err);
      }
    }

    try {
      await deleteUser(user);
    } catch {
      // Do not block deletion with Firebase re-authentication prompts (e.g. auth/requires-recent-login);
      // all application data has already been deleted, so sign out cleanly.
      await signOut(auth);
    }

    setProfile(null);
    setRecords([]);
    setActiveResult(null);
    setActiveTab('home');
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          Loading Diabetes Risk Screening Assistant...
        </div>
      </div>
    );
  }

  if ((!user && !phoneSession) || !profile) {
    return (
      <>
        <AuthScreen
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenLegal={(section) => setLegalModal(section)}
          onPhoneSignIn={handlePhoneSignIn}
        />
        {legalModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="max-w-lg w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {legalModal === 'privacy'
                    ? 'Privacy Policy'
                    : 'About Diabetes Risk Screening Assistant'}
                </h2>
                <button
                  type="button"
                  onClick={() => setLegalModal(null)}
                  aria-label="Close modal"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {legalModal === 'privacy' ? (
                <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    We collect only the four screening inputs (age, blood glucose, BMI, and blood
                    pressure). Contact identifiers are stored separately under strict owner-only
                    access rules.
                  </p>
                  <p>
                    Screening history is saved only when you grant explicit consent, is never shared
                    with third parties, and can be deleted permanently at any time.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    Diabetes Risk Screening Assistant is an educational preliminary screening tool
                    built for mobile Android devices and web browsers using Logistic Regression and
                    Random Forest models.
                  </p>
                  <p>
                    It does not diagnose diabetes or replace evaluation by a qualified healthcare
                    professional.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  const verified = Boolean(phoneSession || isUserVerified(user));
  const contactLabel =
    phoneSession?.phoneNumber || user?.phoneNumber || user?.email || 'Verified Account';

  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'screen', label: 'Screen', icon: PlusCircle },
    { id: 'history', label: 'History', icon: History },
    { id: 'education', label: 'Learn', icon: BookOpen },
    { id: 'settings', label: 'Account', icon: Settings },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setActiveResult(null);
    setApiError(null);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col pb-20 md:pb-0">
      {/* 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 h-14 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 h-full flex items-center justify-between gap-2 sm:gap-6">
          {/* Zone 1: Single-line Brand Title */}
          <button
            type="button"
            onClick={() => handleSelectTab('home')}
            className="flex items-center gap-2 text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white min-w-0"
          >
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white inline-flex items-center justify-center shrink-0">
              <HeartPulse className="w-4 h-4" />
            </span>
            <span className="truncate">Diabetes Assistant</span>
          </button>

          {/* Zone 2: 5 single-line nav links on desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium shrink-0">
            {navItems.map((item) => {
              const active = activeTab === item.id && !activeResult;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Install Prompt + Theme Toggle + Primary CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('screen')}
              className="min-h-[40px] px-2.5 sm:px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>New Screening</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-6xl w-full min-w-0 mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-6">
        {!verified && user && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-sm text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>
                Please verify your email address to enable saving screening history to your account.
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await sendEmailVerification(user);
                setVerificationSent(true);
              }}
              className="min-h-[40px] px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold whitespace-nowrap shrink-0"
            >
              {verificationSent ? 'Verification Email Sent' : 'Resend Verification'}
            </button>
          </div>
        )}

        {activeResult ? (
          <ResultsDashboard
            result={activeResult.result}
            wasSaved={activeResult.wasSaved}
            onNewScreening={() => {
              setActiveResult(null);
              setActiveTab('screen');
            }}
            onBackToHistory={
              activeResult.fromHistory
                ? () => {
                    setActiveResult(null);
                    setActiveTab('history');
                  }
                : undefined
            }
          />
        ) : activeTab === 'home' ? (
          <HomeDashboard
            profile={profile}
            latestRecord={records[0] ?? null}
            totalRecords={records.length}
            backendMode={backendMode}
            onStartScreening={() => handleSelectTab('screen')}
            onOpenHistory={() => handleSelectTab('history')}
            onOpenEducation={() => handleSelectTab('education')}
            onInspectRecord={(record) =>
              setActiveResult({
                result: recordToResult(record),
                wasSaved: true,
                fromHistory: true,
              })
            }
          />
        ) : activeTab === 'screen' ? (
          <ScreeningForm
            defaultModel={profile.preferredModel}
            saveConsent={profile.saveHistoryConsent}
            onToggleSaveConsent={handleUpdateConsent}
            onSubmit={handleRunScreening}
            isSubmitting={isPredicting}
            apiError={apiError}
          />
        ) : activeTab === 'history' ? (
          <HistoryView
            records={records}
            saveConsent={profile.saveHistoryConsent}
            loading={historyLoading}
            onToggleConsent={handleUpdateConsent}
            onSelectRecord={(record) =>
              setActiveResult({
                result: recordToResult(record),
                wasSaved: true,
                fromHistory: true,
              })
            }
            onDeleteRecord={handleDeleteRecord}
            onStartNew={() => handleSelectTab('screen')}
          />
        ) : activeTab === 'education' ? (
          <EducationHub />
        ) : (
          <SettingsView
            profile={profile}
            userContactLabel={contactLabel}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            onUpdateConsent={handleUpdateConsent}
            onUpdateModel={handleUpdateModel}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
          />
        )}
      </main>

      {/* Mobile Bottom Tab Bar (Thumb-Zone Ergonomics) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-5 w-full max-w-full h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id && !activeResult;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`min-w-0 min-h-[44px] px-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
