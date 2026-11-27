import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Lock,
  PlusCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import type { RiskCategory, ScreeningRecord } from '../types/screening';

interface HistoryViewProps {
  records: ScreeningRecord[];
  saveConsent: boolean;
  loading: boolean;
  onToggleConsent: (consent: boolean) => Promise<void>;
  onSelectRecord: (record: ScreeningRecord) => void;
  onDeleteRecord: (recordId: string) => Promise<void>;
  onStartNew: () => void;
}

function getRiskIcon(category: RiskCategory) {
  switch (category) {
    case 'Lower estimated risk':
      return {
        Icon: CheckCircle2,
        color: 'text-emerald-700 dark:text-emerald-400',
      };
    case 'Elevated estimated risk':
      return {
        Icon: AlertTriangle,
        color: 'text-amber-700 dark:text-amber-400',
      };
    case 'Higher estimated risk':
      return {
        Icon: AlertCircle,
        color: 'text-red-700 dark:text-red-400',
      };
  }
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  records,
  saveConsent,
  loading,
  onToggleConsent,
  onSelectRecord,
  onDeleteRecord,
  onStartNew,
}) => {
  const [filter, setFilter] = useState<'all' | RiskCategory>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered =
    filter === 'all' ? records : records.filter((item) => item.riskCategory === filter);

  // Build SVG sparkline from chronological glucose values (oldest -> newest)
  const chronological = [...records].reverse().slice(-12);
  const minG = Math.min(...chronological.map((r) => r.glucose), 70);
  const maxG = Math.max(...chronological.map((r) => r.glucose), 160);
  const rangeG = Math.max(20, maxG - minG);

  const sparkPoints = chronological
    .map((r, idx) => {
      const x =
        chronological.length === 1 ? 150 : 12 + (idx / (chronological.length - 1)) * 276;
      const y = 68 - ((r.glucose - minG) / rangeG) * 52;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteRecord(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
            Consent-Gated Health Log
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Screening History
          </h1>
        </div>
        <button
          type="button"
          onClick={onStartNew}
          className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <PlusCircle className="w-4 h-4" />
          New Screening
        </button>
      </div>

      {/* Consent Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          {saveConsent ? (
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          ) : (
            <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {saveConsent
                ? 'Screening history saving is enabled'
                : 'History saving is currently paused'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {saveConsent
                ? 'Only you can access your saved screenings. You may delete any entry or disable saving anytime.'
                : 'Enable consent below if you would like future screenings saved to your private history.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleConsent(!saveConsent)}
          className={`w-full sm:w-auto min-h-[44px] px-4 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
            saveConsent
              ? 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {saveConsent ? 'Pause History Saving' : 'Enable History Saving'}
        </button>
      </div>

      {/* Glucose Trend Sparkline (shown when >= 2 records) */}
      {chronological.length >= 2 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Blood Glucose Trend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Last {chronological.length} saved screenings (mg/dL)
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-slate-600 dark:text-slate-300">
              Latest: {records[0]?.glucose} mg/dL
            </span>
          </div>

          <svg
            viewBox="0 0 300 84"
            className="w-full h-24 overflow-hidden"
            role="img"
            aria-label="Blood glucose trend across saved screenings"
          >
            <line
              x1="12"
              y1="72"
              x2="288"
              y2="72"
              stroke="currentColor"
              className="text-slate-200 dark:text-slate-800"
              strokeWidth="1"
            />
            <polyline
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={sparkPoints}
            />
            {chronological.map((r, idx) => {
              const x =
                chronological.length === 1 ? 150 : 12 + (idx / (chronological.length - 1)) * 276;
              const y = 68 - ((r.glucose - minG) / rangeG) * 52;
              return (
                <circle
                  key={r.id}
                  cx={x}
                  cy={y}
                  r="4"
                  className="fill-blue-600 stroke-white dark:stroke-slate-900"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        </section>
      )}

      {/* Filter Bar */}
      {records.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-full sm:w-fit">
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'Lower estimated risk', label: 'Lower Risk' },
              { id: 'Elevated estimated risk', label: 'Elevated Risk' },
              { id: 'Higher estimated risk', label: 'Higher Risk' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[40px] px-3.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* List / Loading / Empty State */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            No saved screenings yet
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Run a new screening and keep the storage consent checkbox checked to review your
            results here over time.
          </p>
          <button
            type="button"
            onClick={onStartNew}
            className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            Start First Screening
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {filtered.map((item) => {
            const { Icon, color } = getRiskIcon(item.riskCategory);
            const dateText = new Date(item.createdAtMs).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={item.id}
                onClick={() => onSelectRecord(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRecord(item);
                  }
                }}
                className="w-full p-3.5 sm:p-5 flex items-center justify-between gap-2 sm:gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className={`text-sm font-semibold ${color}`}>{item.riskCategory}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">
                      <span>Glucose {item.glucose} mg/dL</span>
                      <span aria-hidden="true">·</span>
                      <span>BMI {item.bmi} kg/m²</span>
                      <span aria-hidden="true">·</span>
                      <span>BP {item.bloodPressure} mmHg</span>
                      <span aria-hidden="true">·</span>
                      <span>Age {item.age}y</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
                      {dateText} · {item.modelName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={(e) => handleDelete(e, item.id)}
                    aria-label="Delete screening record"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
