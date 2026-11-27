import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Cpu,
  Droplets,
  Gauge,
  HelpCircle,
  Loader2,
  Ruler,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { ModelType, ScreeningInputs } from '../types/screening';

interface ScreeningFormProps {
  defaultModel: ModelType;
  saveConsent: boolean;
  onToggleSaveConsent: (consent: boolean) => Promise<void>;
  onSubmit: (inputs: ScreeningInputs, shouldSave: boolean) => Promise<void>;
  isSubmitting: boolean;
  apiError: string | null;
}

interface FieldErrors {
  age?: string;
  glucose?: string;
  weight?: string;
  height?: string;
  bloodPressure?: string;
}

export const ScreeningForm: React.FC<ScreeningFormProps> = ({
  defaultModel,
  saveConsent,
  onToggleSaveConsent,
  onSubmit,
  isSubmitting,
  apiError,
}) => {
  const [age, setAge] = useState('');
  const [glucose, setGlucose] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [modelType, setModelType] = useState<ModelType>(defaultModel);
  const [saveToHistory, setSaveToHistory] = useState<boolean>(saveConsent);
  const [errors, setErrors] = useState<FieldErrors>({});

  const calculatedBmi = useMemo(() => {
    const w = Number(weightKg);
    const h = Number(heightCm);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    const hMeters = h / 100;
    const raw = w / (hMeters * hMeters);
    if (!Number.isFinite(raw)) return null;
    return Number(raw.toFixed(1));
  }, [weightKg, heightCm]);

  const validate = (): ScreeningInputs | null => {
    const nextErrors: FieldErrors = {};
    const nAge = Number(age);
    const nGlucose = Number(glucose);
    const nWeight = Number(weightKg);
    const nHeight = Number(heightCm);
    const nBp = Number(bloodPressure);

    if (!age.trim() || !Number.isFinite(nAge) || nAge < 18 || nAge > 120) {
      nextErrors.age = 'Enter an age between 18 and 120 years.';
    }
    if (!glucose.trim() || !Number.isFinite(nGlucose) || nGlucose < 40 || nGlucose > 600) {
      nextErrors.glucose = 'Enter a blood glucose level between 40 and 600 mg/dL.';
    }
    if (!weightKg.trim() || !Number.isFinite(nWeight) || nWeight < 25 || nWeight > 300) {
      nextErrors.weight = 'Enter a body weight between 25 and 300 kg.';
    }
    if (!heightCm.trim() || !Number.isFinite(nHeight) || nHeight < 100 || nHeight > 250) {
      nextErrors.height = 'Enter a height between 100 and 250 cm.';
    }
    if (
      !nextErrors.weight &&
      !nextErrors.height &&
      (calculatedBmi === null || calculatedBmi < 10 || calculatedBmi > 80)
    ) {
      nextErrors.weight = 'Calculated BMI must fall between 10 and 80 kg/m². Check weight and height.';
    }
    if (!bloodPressure.trim() || !Number.isFinite(nBp) || nBp < 40 || nBp > 250) {
      nextErrors.bloodPressure = 'Enter a blood pressure reading between 40 and 250 mmHg.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || calculatedBmi === null) return null;

    return {
      age: nAge,
      glucose: nGlucose,
      bmi: calculatedBmi,
      bloodPressure: nBp,
      modelType,
    };
  };

  const handleConsentChange = async (checked: boolean) => {
    setSaveToHistory(checked);
    if (checked !== saveConsent) {
      await onToggleSaveConsent(checked);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = validate();
    if (!valid) return;
    await onSubmit(valid, saveToHistory);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
          Screening Measurements · Preliminary Evaluation
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
          New Diabetes Risk Screening
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Enter your age, blood glucose, weight, height, and blood pressure below. Body Mass Index
          (BMI) is calculated automatically from your weight and height.
        </p>
      </div>

      {/* Non-Diagnostic Notice */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
          This screening estimates statistical risk patterns for educational purposes only. It
          cannot diagnose diabetes or replace laboratory blood tests ordered by a clinician.
        </p>
      </div>

      {apiError && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-4 flex items-start gap-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{apiError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* Measurement Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* 1. Age */}
          <div className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="input-age"
                className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                1. Age
              </label>
              <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                years (18–120)
              </span>
            </div>
            <div className="relative">
              <input
                id="input-age"
                type="number"
                inputMode="numeric"
                min={18}
                max={120}
                step={1}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 42"
                className="w-full min-h-[48px] pl-4 pr-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono-tabular text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400">
                years
              </span>
            </div>
            {errors.age && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errors.age}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Insulin sensitivity naturally shifts with age; adults 45 and older carry higher
              baseline screening priority.
            </p>
          </div>

          {/* 2. Blood Glucose */}
          <div className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="input-glucose"
                className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"
              >
                <Droplets className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                2. Blood Glucose Level
              </label>
              <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                mg/dL (40–600)
              </span>
            </div>
            <div className="relative">
              <input
                id="input-glucose"
                type="number"
                inputMode="decimal"
                min={40}
                max={600}
                step="any"
                value={glucose}
                onChange={(e) => setGlucose(e.target.value)}
                placeholder="e.g. 112"
                className="w-full min-h-[48px] pl-4 pr-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono-tabular text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400">
                mg/dL
              </span>
            </div>
            {errors.glucose && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">{errors.glucose}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Plasma glucose concentration in mg/dL. Standard fasting values are typically below
              100 mg/dL; 100–125 mg/dL falls in the prediabetes reference range.
            </p>
          </div>

          {/* 3. Weight & Height (Auto-calculates BMI) */}
          <div className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                3. Weight & Height (Auto BMI)
              </span>
              <span className="text-xs font-mono-tabular text-blue-600 dark:text-blue-400 font-semibold">
                {calculatedBmi !== null ? `BMI: ${calculatedBmi} kg/m²` : 'BMI: -- kg/m²'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="input-weight"
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-1"
                >
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  Weight (kg)
                </label>
                <div className="relative">
                  <input
                    id="input-weight"
                    type="number"
                    inputMode="decimal"
                    min={25}
                    max={300}
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="e.g. 72"
                    className="w-full min-h-[48px] pl-4 pr-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono-tabular text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    kg
                  </span>
                </div>
                {errors.weight && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {errors.weight}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="input-height"
                  className="text-xs font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-1"
                >
                  <Ruler className="w-3.5 h-3.5 text-slate-400" />
                  Height (cm)
                </label>
                <div className="relative">
                  <input
                    id="input-height"
                    type="number"
                    inputMode="decimal"
                    min={100}
                    max={250}
                    step="0.1"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="e.g. 170"
                    className="w-full min-h-[48px] pl-4 pr-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono-tabular text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    cm
                  </span>
                </div>
                {errors.height && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {errors.height}
                  </p>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              BMI is automatically calculated as weight (kg) ÷ height (m)². Standard healthy range
              is 18.5–24.9 kg/m².
            </p>
          </div>

          {/* 4. Blood Pressure */}
          <div className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="input-bp"
                className="text-sm font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2"
              >
                <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                4. Blood Pressure
              </label>
              <span className="text-xs font-mono-tabular text-slate-500 dark:text-slate-400">
                mmHg (40–250)
              </span>
            </div>
            <div className="relative">
              <input
                id="input-bp"
                type="number"
                inputMode="numeric"
                min={40}
                max={250}
                step={1}
                value={bloodPressure}
                onChange={(e) => setBloodPressure(e.target.value)}
                placeholder="e.g. 76"
                className="w-full min-h-[48px] pl-4 pr-16 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono-tabular text-base focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 dark:text-slate-400">
                mmHg
              </span>
            </div>
            {errors.bloodPressure && (
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                {errors.bloodPressure}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Resting diastolic blood pressure in mmHg (the lower number in a standard reading,
              typically 60–80 mmHg).
            </p>
          </div>
        </div>

        {/* Model Selection & Consent Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
          <div className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Screening Model
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setModelType('logistic_regression')}
                className={`min-w-0 min-h-[44px] px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap truncate ${
                  modelType === 'logistic_regression'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Logistic Regression
              </button>
              <button
                type="button"
                onClick={() => setModelType('random_forest')}
                className={`min-w-0 min-h-[44px] px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap truncate ${
                  modelType === 'random_forest'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Random Forest
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Logistic Regression provides linear risk weighting; Random Forest captures non-linear
              interactions across glucose, BMI, age, and blood pressure.
            </p>
          </div>

          <div className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              History Storage Permission
            </div>
            <label className="flex items-start gap-3 cursor-pointer select-none min-h-[44px]">
              <input
                type="checkbox"
                checked={saveToHistory}
                onChange={(e) => handleConsentChange(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-600 shrink-0"
              />
              <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                I consent to saving this screening result to my private history so I can track
                measurements over time. You can delete saved history anytime.
              </span>
            </label>
          </div>
        </div>

        {/* Submit CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Results include circular risk percentage, factor breakdowns, and guidance.</span>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[48px] px-6 sm:px-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing Measurements...
              </>
            ) : (
              <>
                Run Screening Analysis
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
