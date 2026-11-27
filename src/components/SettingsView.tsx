import React, { useState } from 'react';
import {
  AlertTriangle,
  Database,
  LogOut,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
} from 'lucide-react';
import type { ModelType, ThemeMode, UserProfile } from '../types/screening';

interface SettingsViewProps {
  profile: UserProfile;
  userContactLabel: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onUpdateConsent: (consent: boolean) => Promise<void>;
  onUpdateModel: (model: ModelType) => Promise<void>;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  userContactLabel,
  theme,
  onToggleTheme,
  onUpdateConsent,
  onUpdateModel,
  onLogout,
  onDeleteAccount,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleConfirmDelete = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await onDeleteAccount();
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : 'Could not complete account deletion. For security, please sign out, sign back in, and try again.'
      );
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
          Preferences, Privacy & Security
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Account & Privacy Settings
        </h1>
      </div>

      {/* Account Summary & Theme */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900 dark:text-white truncate">
              {profile.displayName}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 break-all">
              {userContactLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Light / Dark Mode */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Appearance</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Switch between light and dark medical interface themes.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-medium inline-flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-blue-600" />
                Dark Mode
              </>
            )}
          </button>
        </div>

        {/* Default ML Model */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Default ML Screening Model
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Choose the default algorithm pre-selected for new screenings.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onUpdateModel('logistic_regression')}
              className={`min-w-0 min-h-[40px] px-2.5 sm:px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap truncate ${
                profile.preferredModel === 'logistic_regression'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Logistic Regression
            </button>
            <button
              type="button"
              onClick={() => onUpdateModel('random_forest')}
              className={`min-w-0 min-h-[40px] px-2.5 sm:px-3 rounded-lg text-xs font-medium transition-colors whitespace-nowrap truncate ${
                profile.preferredModel === 'random_forest'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Random Forest
            </button>
          </div>
        </div>

        {/* Screening History Consent */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 sm:gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Save Screening History Consent
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              History is never stored unless you explicitly grant consent.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateConsent(!profile.saveHistoryConsent)}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              profile.saveHistoryConsent
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {profile.saveHistoryConsent ? 'Consent Granted' : 'Consent Paused'}
          </button>
        </div>
      </section>

      {/* Privacy Policy & About App */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Privacy Policy</span>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-disc pl-4">
            <li>
              <strong>Minimal Data Collection:</strong> Screenings accept only age, blood glucose,
              weight, height (for BMI calculation), and blood pressure.
            </li>
            <li>
              <strong>Isolated & Protected Storage:</strong> Contact identifiers are isolated under
              owner-only Firestore security rules, and passwords are never stored in plain text.
            </li>
            <li>
              <strong>No Third-Party Sharing:</strong> Your health measurements are never sold,
              shared with advertisers, or disclosed to third parties.
            </li>
            <li>
              <strong>User Control:</strong> Screenings are saved only with your consent, and you
              can delete individual records or your entire account anytime.
            </li>
          </ul>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>About Diabetes Risk Screening Assistant</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Built as a mobile-first, Android Capacitor-compatible preliminary screening tool pairing
            a React + TypeScript interface with Python FastAPI + Scikit-learn (Logistic Regression &
            Random Forest Classifier) pipelines trained on the Pima Indians Diabetes Dataset.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Disclaimer: Educational preliminary screening tool only. It is not intended to diagnose,
            treat, cure, or prevent any disease.
          </p>
        </section>
      </div>

      {/* Delete Account & All Data */}
      <section className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-4 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Database className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <h2 className="text-base font-semibold text-red-900 dark:text-red-200">
              Delete Account & All Saved Data
            </h2>
            <p className="text-xs sm:text-sm text-red-800/80 dark:text-red-300/80 leading-relaxed">
              Permanently erases your profile, private contact record, all saved screening results,
              and your authentication account. This action cannot be undone.
            </p>
          </div>
        </div>

        {deleteError && (
          <div className="rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-900 p-3 text-xs text-red-700 dark:text-red-300">
            {deleteError}
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setConfirmDelete(true);
          }}
          className="min-h-[44px] px-4 rounded-xl border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account and Data
        </button>
      </section>

      {/* Delete Confirmation Alert Box */}
      {confirmDelete && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="delete-alert-title"
          aria-describedby="delete-alert-desc"
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3
                  id="delete-alert-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Delete Account &amp; Saved Data?
                </h3>
                <p
                  id="delete-alert-desc"
                  className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed"
                >
                  This will permanently delete your account profile and all saved screening history.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmDelete(false)}
                className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="min-h-[44px] px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
              >
                {deleting ? 'Deleting Data...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
