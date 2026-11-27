import React, { useState } from 'react';
import { Apple, BookOpen, HeartPulse, Stethoscope } from 'lucide-react';

type EduSection = 'basics' | 'metrics' | 'prevention' | 'doctor';

export const EducationHub: React.FC = () => {
  const [section, setSection] = useState<EduSection>('basics');
  const [glucoseImgFailed, setGlucoseImgFailed] = useState(false);
  const [lifestyleImgFailed, setLifestyleImgFailed] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
          Patient Education · Evidence-Based Guidance
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Diabetes Education & Prevention
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Learn how blood glucose, body mass index, blood pressure, and age relate to metabolic
          health and preventive care.
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 w-full sm:w-fit">
        {(
          [
            { id: 'basics', label: 'Diabetes Basics' },
            { id: 'metrics', label: 'Your 4 Metrics' },
            { id: 'prevention', label: 'Prevention & Lifestyle' },
            { id: 'doctor', label: 'When to See a Doctor' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={`min-h-[44px] px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              section === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === 'basics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800">
              {!glucoseImgFailed ? (
                <img
                  src="/src/assets/images/edu_glucose_science_1795759921604.jpg"
                  alt="Blood glucose meter on clinical desk"
                  referrerPolicy="no-referrer"
                  onError={() => setGlucoseImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </div>
            <div className="p-4 sm:p-6 space-y-2 flex-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                What is Type 2 Diabetes & Prediabetes?
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Glucose is the body&apos;s primary source of cellular energy. When cells become less
                responsive to insulin (insulin resistance), glucose stays elevated in the
                bloodstream. Prediabetes represents an early, often reversible stage before Type 2
                diabetes develops.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Why Early Screening Matters
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                <p>
                  Many people with prediabetes or early elevated blood glucose experience no obvious
                  day-to-day symptoms.
                </p>
                <p>
                  Identifying elevated metabolic patterns early allows individuals and clinicians to
                  act through structured nutrition, regular aerobic and resistance movement, sleep
                  consistency, and clinical lab follow-up.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                Clinical Diagnostic Reference (ADA Guidelines)
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Formal diagnosis requires clinical laboratory testing such as Fasting Plasma Glucose
                (126 mg/dL or higher), HbA1c (6.5% or higher), or a 2-hour Oral Glucose Tolerance
                Test.
              </p>
            </div>
          </div>
        </div>
      )}

      {section === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            {
              title: 'Blood Glucose Level (mg/dL)',
              reference: 'Fasting reference: < 100 mg/dL · Prediabetes range: 100–125 mg/dL',
              detail:
                'Measures circulating sugar in the blood. Persistent elevations indicate reduced insulin sensitivity or insufficient insulin output.',
            },
            {
              title: 'Body Mass Index (kg/m²)',
              reference: 'Standard reference: 18.5–24.9 kg/m² · Elevated risk: ≥ 25 kg/m²',
              detail:
                'Higher visceral adipose tissue is closely correlated with hepatic and muscular insulin resistance across population cohorts.',
            },
            {
              title: 'Blood Pressure (mmHg)',
              reference: 'Normal diastolic: < 80 mmHg · Elevated: ≥ 80 mmHg',
              detail:
                'Elevated blood pressure frequently co-occurs with metabolic syndrome and increases cardiovascular risk alongside elevated glucose.',
            },
            {
              title: 'Age (Years)',
              reference: 'Routine adult screening priority increases at 35–45+ years',
              detail:
                'Metabolic rate and beta-cell reserve gradually shift over decades, making periodic screening increasingly valuable with age.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 space-y-2.5"
            >
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                {card.title}
              </h2>
              <p className="text-xs font-mono-tabular text-blue-600 dark:text-blue-400 break-words">
                {card.reference}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {card.detail}
              </p>
            </div>
          ))}
        </div>
      )}

      {section === 'prevention' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800">
              {!lifestyleImgFailed ? (
                <img
                  src="/src/assets/images/edu_prevention_lifestyle_1795759921553.jpg"
                  alt="Balanced whole-food Mediterranean meal and water"
                  referrerPolicy="no-referrer"
                  onError={() => setLifestyleImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Apple className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </div>
            <div className="p-4 sm:p-6 space-y-2">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Everyday Prevention Habits
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Clinical trials such as the Diabetes Prevention Program show that modest sustainable
                habits can lower progression risk significantly.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800">
            {[
              {
                heading: 'High-Fiber, Low-Glycemic Meals',
                body: 'Center meals around non-starchy vegetables, legumes, whole grains, nuts, and lean proteins while limiting sugar-sweetened beverages and refined starches.',
              },
              {
                heading: '150+ Minutes of Weekly Movement',
                body: 'Brisk walking (especially 10–15 minutes after meals) plus twice-weekly strength training helps skeletal muscles absorb glucose without extra insulin.',
              },
              {
                heading: 'Sleep & Stress Regulation',
                body: 'Aim for 7–9 hours of consistent sleep; chronic sleep deprivation elevates cortisol and impairs next-day insulin sensitivity.',
              },
              {
                heading: 'Gradual, Sustainable Weight Management',
                body: 'Even a 5% to 7% reduction in body weight when BMI is elevated meaningfully improves fasting glucose and blood pressure.',
              },
            ].map((item) => (
              <div key={item.heading} className="py-4 first:pt-0 last:pb-0 space-y-1">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {item.heading}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'doctor' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              When to Consult a Healthcare Professional
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <div className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-white">
                Schedule Routine Lab Screening If:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Your screening result indicates Elevated or Higher estimated risk</li>
                <li>Your fasting blood glucose is 100 mg/dL or higher</li>
                <li>You are age 35 or older with BMI ≥ 25 kg/m²</li>
                <li>You have high blood pressure or a family history of diabetes</li>
              </ul>
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-white">
                Seek Prompt Medical Care For Symptoms Such As:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Unexplained excessive thirst or frequent urination</li>
                <li>Unintentional weight loss or persistent fatigue</li>
                <li>Blurred vision or slow-healing cuts</li>
                <li>Numbness or tingling in hands or feet</li>
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <HeartPulse className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            Diabetes Risk Screening Assistant provides educational information only and is not a
            medical device.
          </p>
        </div>
      )}
    </div>
  );
};
