import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Info,
  PlusCircle,
  Stethoscope,
} from 'lucide-react';
import type { RiskCategory, ScreeningResult } from '../types/screening';

interface ResultsDashboardProps {
  result: ScreeningResult;
  wasSaved: boolean;
  onNewScreening: () => void;
  onBackToHistory?: () => void;
}

function getRiskPresentation(category: RiskCategory) {
  switch (category) {
    case 'Lower estimated risk':
      return {
        icon: CheckCircle2,
        containerClass:
          'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30',
        textClass: 'text-emerald-800 dark:text-emerald-200',
        strokeColor: '#059669',
        trackColor: 'text-emerald-200/70 dark:text-emerald-900/60',
      };
    case 'Elevated estimated risk':
      return {
        icon: AlertTriangle,
        containerClass:
          'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30',
        textClass: 'text-amber-800 dark:text-amber-200',
        strokeColor: '#D97706',
        trackColor: 'text-amber-200/70 dark:text-amber-900/60',
      };
    case 'Higher estimated risk':
      return {
        icon: AlertCircle,
        containerClass: 'border-red-200 dark:border-red-900/60 bg-red-50/70 dark:bg-red-950/30',
        textClass: 'text-red-800 dark:text-red-200',
        strokeColor: '#DC2626',
        trackColor: 'text-red-200/70 dark:text-red-900/60',
      };
  }
}

interface MetricRangeProps {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  referenceNote: string;
  highlightThreshold: number;
}

const MetricRangeGauge: React.FC<MetricRangeProps> = ({
  label,
  value,
  unit,
  min,
  max,
  referenceNote,
  highlightThreshold,
}) => {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const thresholdPct = Math.min(
    100,
    Math.max(0, ((highlightThreshold - min) / (max - min)) * 100)
  );
  const aboveRef = value >= highlightThreshold;

  return (
    <div className="space-y-2 py-3 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-900 dark:text-white">{label}</span>
        <span className="text-sm font-semibold font-mono-tabular text-slate-900 dark:text-white">
          {value} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{unit}</span>
        </span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            aboveRef ? 'bg-amber-500 dark:bg-amber-400' : 'bg-blue-600 dark:bg-blue-500'
          }`}
          style={{ width: `${pct}%` }}
        />
        <div
          aria-hidden="true"
          title={`Reference threshold: ${highlightThreshold} ${unit}`}
          className="absolute top-0 bottom-0 w-0.5 bg-slate-900/40 dark:bg-white/50"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        <span>{referenceNote}</span>
        <span className="font-mono-tabular">
          {aboveRef ? 'Above reference mark' : 'Within lower range'}
        </span>
      </div>
    </div>
  );
};

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  result,
  wasSaved,
  onNewScreening,
  onBackToHistory,
}) => {
  const riskUI = getRiskPresentation(result.riskCategory);
  const RiskIcon = riskUI.icon;

  const displayPercent =
    result.isCalibrated && typeof result.calibratedProbability === 'number'
      ? Math.round(result.calibratedProbability * 100)
      : Math.min(99, Math.max(1, Math.round(result.riskPercentage ?? 0)));

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (displayPercent / 100) * circumference;

  const contribList = [
    {
      key: 'glucose',
      label: 'Blood Glucose',
      value: result.contributions.glucose,
      reading: `${result.inputs.glucose} mg/dL`,
    },
    {
      key: 'bmi',
      label: 'Calculated BMI',
      value: result.contributions.bmi,
      reading: `${result.inputs.bmi} kg/m²`,
    },
    {
      key: 'age',
      label: 'Age',
      value: result.contributions.age,
      reading: `${result.inputs.age} years`,
    },
    {
      key: 'bloodPressure',
      label: 'Blood Pressure',
      value: result.contributions.bloodPressure,
      reading: `${result.inputs.bloodPressure} mmHg`,
    },
  ].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{result.modelName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {result.modelMode === 'validated_sklearn'
                ? 'Validated Scikit-learn Model'
                : 'Demonstration Reference Model'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{wasSaved ? 'Saved to History' : 'Session Only (Not Saved)'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Screening Result Summary
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {onBackToHistory && (
            <button
              type="button"
              onClick={onBackToHistory}
              className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" />
              History
            </button>
          )}
          <button
            type="button"
            onClick={onNewScreening}
            className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            New Screening
          </button>
        </div>
      </div>

      {/* Primary Risk Category & Circular Percentage Gauge */}
      <section
        className={`rounded-3xl border p-4 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 ${riskUI.containerClass}`}
      >
        <div className="flex items-start gap-3 sm:gap-4 text-left w-full sm:w-auto min-w-0">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-700/60 shrink-0">
            <RiskIcon className={`w-6 h-6 sm:w-7 sm:h-7 ${riskUI.textClass}`} />
          </div>
          <div className="space-y-1.5 min-w-0">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Preliminary Risk Category (Non-Diagnostic)
            </p>
            <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight break-words ${riskUI.textClass}`}>
              {result.riskCategory}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {result.isCalibrated
                ? 'Calibrated model risk percentage shown in the gauge.'
                : 'Demonstration model screening score shown as a percentage (not a clinical diagnosis).'}
            </p>
          </div>
        </div>

        {/* Circular Risk Percentage Ring */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <svg
            viewBox="0 0 128 128"
            className="w-full h-full -rotate-90"
            role="img"
            aria-label={`Estimated screening risk ${displayPercent} percent`}
          >
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className={riskUI.trackColor}
            />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={riskUI.strokeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className={`text-3xl font-bold font-mono-tabular ${riskUI.textClass}`}>
              {displayPercent}%
            </span>
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              Est. Risk
            </span>
          </div>
        </div>
      </section>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Contributing Risk Factors */}
        <section className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-5">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Contributing Input Factors
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Relative influence of each measurement on this screening output (positive values
              increase estimated risk; negative values lower it).
            </p>
          </div>

          <div className="space-y-4">
            {contribList.map((item) => {
              const absVal = Math.min(100, Math.abs(item.value));
              const increasesRisk = item.value >= 0;
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {item.label}{' '}
                      <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                        ({item.reading})
                      </span>
                    </span>
                    <span
                      className={`text-xs font-mono-tabular font-semibold ${
                        increasesRisk
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {increasesRisk ? '+' : ''}
                      {item.value.toFixed(1)}% weight
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        increasesRisk
                          ? 'bg-blue-600 dark:bg-blue-500'
                          : 'bg-emerald-600 dark:bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(6, absVal)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Input Summary & Reference Ranges */}
        <section className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Recorded Measurements vs Reference Marks
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vertical marker indicates common clinical screening thresholds.
            </p>
          </div>

          <div>
            <MetricRangeGauge
              label="Blood Glucose Level"
              value={result.inputs.glucose}
              unit="mg/dL"
              min={40}
              max={260}
              highlightThreshold={100}
              referenceNote="Fasting reference < 100 mg/dL"
            />
            <MetricRangeGauge
              label="Calculated Body Mass Index (BMI)"
              value={result.inputs.bmi}
              unit="kg/m²"
              min={15}
              max={50}
              highlightThreshold={25}
              referenceNote="Standard healthy mark < 25 kg/m²"
            />
            <MetricRangeGauge
              label="Blood Pressure (Diastolic)"
              value={result.inputs.bloodPressure}
              unit="mmHg"
              min={40}
              max={130}
              highlightThreshold={80}
              referenceNote="Normal diastolic < 80 mmHg"
            />
            <MetricRangeGauge
              label="Age"
              value={result.inputs.age}
              unit="years"
              min={18}
              max={95}
              highlightThreshold={45}
              referenceNote="Routine screening age mark 45+ years"
            />
          </div>
        </section>
      </div>

      {/* Explanation & Healthcare Recommendation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Understanding This Result</span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">
            {result.explanation}
          </p>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 break-words">
              Top evaluated signals: {result.topFactors.join(' · ')}
            </p>
          </div>
        </section>

        <section className="lg:col-span-5 min-w-0 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-blue-950 dark:text-blue-100">
            <Stethoscope className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Next Steps & Medical Guidance</span>
          </div>
          <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed break-words">
            {result.recommendation}
          </p>
          <p className="text-xs text-blue-800/80 dark:text-blue-300/80 pt-2 border-t border-blue-200/70 dark:border-blue-900/60 break-words">
            {result.disclaimer}
          </p>
        </section>
      </div>
    </div>
  );
};
