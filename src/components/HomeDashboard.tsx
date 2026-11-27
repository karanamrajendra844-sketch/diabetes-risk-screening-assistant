import React from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  History,
  PlusCircle,
  ShieldCheck,
} from 'lucide-react';
import type { ScreeningRecord, UserProfile } from '../types/screening';

interface HomeDashboardProps {
  profile: UserProfile;
  latestRecord: ScreeningRecord | null;
  totalRecords: number;
  backendMode: 'validated_sklearn' | 'demonstration';
  onStartScreening: () => void;
  onOpenHistory: () => void;
  onOpenEducation: () => void;
  onInspectRecord: (record: ScreeningRecord) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  profile,
  latestRecord,
  totalRecords,
  backendMode,
  onStartScreening,
  onOpenHistory,
  onOpenEducation,
  onInspectRecord,
}) => {
  return (
    <div className="space-y-6">
      {/* Hero Action Card */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-3 max-w-2xl min-w-0">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400 break-words">
            Welcome back, {profile.displayName} · Preliminary Screening Dashboard
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            Track key metabolic risk factors with clarity.
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Run a quick screening using your age, blood glucose, weight, height (auto-calculated
            BMI), and blood pressure with{' '}
            {profile.preferredModel === 'random_forest'
              ? 'Random Forest Classifier'
              : 'Logistic Regression'}
            . Educational screening only—not a medical diagnosis.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartScreening}
          className="w-full sm:w-auto min-h-[48px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Start New Screening
        </button>
      </section>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        <div className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Active ML Engine</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-white">
            {profile.preferredModel === 'random_forest'
              ? 'Random Forest Classifier'
              : 'Logistic Regression'}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {backendMode === 'validated_sklearn'
              ? 'Connected to calibrated Scikit-learn API'
              : 'Demonstration reference model active'}
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Saved Screenings</p>
          <p className="text-2xl font-bold font-mono-tabular text-slate-900 dark:text-white">
            {totalRecords}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 inline-flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              {profile.saveHistoryConsent
                ? 'History consent active'
                : 'History saving paused (consent off)'}
            </span>
          </p>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">Latest Screening</p>
          {latestRecord ? (
            <>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {latestRecord.riskCategory}
              </p>
              <button
                type="button"
                onClick={() => onInspectRecord(latestRecord)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                View full breakdown <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">No records yet</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete a screening to see your summary.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        <button
          type="button"
          onClick={onOpenHistory}
          className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 text-left hover:border-blue-300 dark:hover:border-blue-800 transition-colors flex items-start justify-between gap-4"
        >
          <div className="min-w-0 space-y-1.5">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <History className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Previous Screening History</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Review consented screenings, track glucose trends, or delete stored entries.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        </button>

        <button
          type="button"
          onClick={onOpenEducation}
          className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 text-left hover:border-blue-300 dark:hover:border-blue-800 transition-colors flex items-start justify-between gap-4"
        >
          <div className="min-w-0 space-y-1.5">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Diabetes Prevention & Education</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Explore evidence-based nutrition, exercise habits, and lab reference ranges.
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
        </button>
      </div>

      {/* 4-Metric Reference Strip */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Standard Adult Reference Ranges
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Blood Glucose', value: '< 100 mg/dL', note: 'Fasting reference' },
            { label: 'BMI', value: '18.5–24.9 kg/m²', note: 'Healthy adult range' },
            { label: 'Blood Pressure', value: '< 80 mmHg', note: 'Normal diastolic' },
            { label: 'Age', value: '18–120 years', note: 'Routine check 35–45+' },
          ].map((metric) => (
            <div
              key={metric.label}
              className="min-w-0 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-0.5"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</p>
              <p className="text-sm font-semibold font-mono-tabular text-slate-900 dark:text-white">
                {metric.value}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{metric.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
