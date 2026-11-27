import 'dotenv/config';
import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ModelType = 'logistic_regression' | 'random_forest';

interface ValidatedInputs {
  age: number;
  glucose: number;
  bmi: number;
  bloodPressure: number;
  modelType: ModelType;
}

function validatePythonBackendUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const blockedHosts = ['169.254.169.254', 'metadata.google.internal'];
    if (blockedHosts.includes(parsed.hostname.toLowerCase())) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function validateScreeningBody(body: unknown): { ok: true; data: ValidatedInputs } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Request payload must be a JSON object.' };
  }
  const obj = body as Record<string, unknown>;
  const allowedKeys = new Set(['age', 'glucose', 'bmi', 'bloodPressure', 'modelType', 'saveToHistory']);
  for (const key of Object.keys(obj)) {
    if (!allowedKeys.has(key)) {
      return { ok: false, error: `Unexpected field "${key}". Only age, glucose, bmi, and bloodPressure are accepted.` };
    }
  }

  const age = Number(obj.age);
  const glucose = Number(obj.glucose);
  const bmi = Number(obj.bmi);
  const bloodPressure = Number(obj.bloodPressure);
  const modelType: ModelType =
    obj.modelType === 'random_forest' ? 'random_forest' : 'logistic_regression';

  if (!Number.isFinite(age) || age < 18 || age > 120) {
    return { ok: false, error: 'Age must be between 18 and 120 years.' };
  }
  if (!Number.isFinite(glucose) || glucose < 40 || glucose > 600) {
    return { ok: false, error: 'Blood glucose level must be between 40 and 600 mg/dL.' };
  }
  if (!Number.isFinite(bmi) || bmi < 10 || bmi > 80) {
    return { ok: false, error: 'BMI must be between 10 and 80 kg/m².' };
  }
  if (!Number.isFinite(bloodPressure) || bloodPressure < 40 || bloodPressure > 250) {
    return { ok: false, error: 'Blood pressure must be between 40 and 250 mmHg.' };
  }

  return {
    ok: true,
    data: { age, glucose, bmi, bloodPressure, modelType },
  };
}

function runReferenceScreening(inputs: ValidatedInputs) {
  const { age, glucose, bmi, bloodPressure, modelType } = inputs;

  // Reference epidemiological means & standard deviations (Pima Indians Diabetes reference cohort)
  const zGlucose = (glucose - 121.6) / 30.5;
  const zBmi = (bmi - 32.4) / 6.9;
  const zAge = (age - 33.2) / 11.8;
  const zBp = (bloodPressure - 72.4) / 12.1;

  let rawScore = 0;
  let rawContrib: Record<'glucose' | 'bmi' | 'age' | 'bloodPressure', number>;
  let modelName: 'Logistic Regression' | 'Random Forest Classifier';

  if (modelType === 'random_forest') {
    modelName = 'Random Forest Classifier';
    const gScore = glucose >= 140 ? 0.44 : glucose >= 115 ? 0.24 : glucose >= 100 ? 0.12 : 0.04;
    const bScore = bmi >= 35 ? 0.24 : bmi >= 30 ? 0.18 : bmi >= 25 ? 0.1 : 0.03;
    const aScore = age >= 50 ? 0.18 : age >= 40 ? 0.12 : age >= 30 ? 0.07 : 0.03;
    const bpScore = bloodPressure >= 90 ? 0.12 : bloodPressure >= 80 ? 0.07 : 0.02;

    rawScore = Math.min(0.98, gScore + bScore + aScore + bpScore);
    rawContrib = {
      glucose: Math.max(0, zGlucose) * 0.92 + zGlucose * 0.2,
      bmi: Math.max(0, zBmi) * 0.5 + zBmi * 0.15,
      age: Math.max(0, zAge) * 0.36 + zAge * 0.1,
      bloodPressure: Math.max(0, zBp) * 0.22 + zBp * 0.05,
    };
  } else {
    modelName = 'Logistic Regression';
    const logit = -1.12 + 1.15 * zGlucose + 0.62 * zBmi + 0.38 * zAge + 0.12 * zBp;
    rawScore = 1 / (1 + Math.exp(-logit));
    rawContrib = {
      glucose: zGlucose * 1.15,
      bmi: zBmi * 0.62,
      age: zAge * 0.38,
      bloodPressure: zBp * 0.12,
    };
  }

  const totalAbs =
    Math.abs(rawContrib.glucose) +
      Math.abs(rawContrib.bmi) +
      Math.abs(rawContrib.age) +
      Math.abs(rawContrib.bloodPressure) || 1;

  const contributions = {
    glucose: Number(((rawContrib.glucose / totalAbs) * 100).toFixed(2)),
    bmi: Number(((rawContrib.bmi / totalAbs) * 100).toFixed(2)),
    age: Number(((rawContrib.age / totalAbs) * 100).toFixed(2)),
    bloodPressure: Number(((rawContrib.bloodPressure / totalAbs) * 100).toFixed(2)),
  };

  let riskCategory: 'Lower estimated risk' | 'Elevated estimated risk' | 'Higher estimated risk';
  if (rawScore < 0.3) {
    riskCategory = 'Lower estimated risk';
  } else if (rawScore < 0.6) {
    riskCategory = 'Elevated estimated risk';
  } else {
    riskCategory = 'Higher estimated risk';
  }

  const labelMap: Record<keyof typeof contributions, string> = {
    glucose: `Blood glucose (${glucose.toFixed(0)} mg/dL)`,
    bmi: `Body Mass Index (${bmi.toFixed(1)} kg/m²)`,
    age: `Age (${age.toFixed(0)} years)`,
    bloodPressure: `Blood pressure (${bloodPressure.toFixed(0)} mmHg)`,
  };

  const topFactors = (Object.entries(contributions) as Array<[keyof typeof contributions, number]>)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([key]) => labelMap[key]);

  const factorSummary = topFactors.slice(0, 2).join(' and ');

  let explanation = '';
  let recommendation = '';

  if (riskCategory === 'Lower estimated risk') {
    explanation = `Preliminary demonstration result (${modelName}): Your recorded measurements (glucose ${glucose.toFixed(0)} mg/dL, BMI ${bmi.toFixed(1)} kg/m², blood pressure ${bloodPressure.toFixed(0)} mmHg, age ${age.toFixed(0)} years) align with the lower-risk reference group. Key signals evaluated included ${factorSummary}.`;
    recommendation =
      'Maintain balanced nutrition, regular physical activity, and routine preventive checkups. Consult a healthcare professional if you notice symptoms or have personal risk factors.';
  } else if (riskCategory === 'Elevated estimated risk') {
    explanation = `Preliminary demonstration result (${modelName}): Your profile reflects moderate metabolic indicators associated with elevated screening risk, influenced primarily by ${factorSummary}. This estimate is not a medical diagnosis.`;
    recommendation =
      'Consider scheduling a preventive visit with a qualified healthcare professional to discuss standardized lab tests (such as fasting glucose or HbA1c) and lifestyle support.';
  } else {
    explanation = `Preliminary demonstration result (${modelName}): Several measurements—especially ${factorSummary}—fall within ranges associated with higher screening risk in reference data. Only clinical laboratory testing can diagnose diabetes.`;
    recommendation =
      'We encourage consulting a qualified healthcare professional promptly for formal laboratory testing (fasting plasma glucose or HbA1c) and individualized medical guidance.';
  }

  return {
    riskCategory,
    riskPercentage: Math.min(99, Math.max(1, Math.round(rawScore * 100))),
    modelName,
    modelMode: 'demonstration' as const,
    isCalibrated: false,
    calibratedProbability: null,
    contributions,
    topFactors,
    explanation,
    recommendation,
    disclaimer:
      'Educational preliminary screening only. This demonstration reference estimate does not diagnose diabetes or replace professional medical advice.',
    inputs,
    modelMetrics: null,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  const pythonBackendUrl = validatePythonBackendUrl(process.env.PYTHON_BACKEND_URL);

  app.get('/api/health', async (_req: Request, res: Response) => {
    if (pythonBackendUrl) {
      try {
        const upstream = await fetch(`${pythonBackendUrl}/api/health`, {
          signal: AbortSignal.timeout(2500),
        });
        if (upstream.ok) {
          const data = await upstream.json();
          res.json({ ...data, gateway: 'node-proxy', pythonConnected: true });
          return;
        }
      } catch {
        // Fall through to demonstration status
      }
    }
    res.json({
      status: 'ok',
      modelMode: 'demonstration',
      pythonConnected: false,
    });
  });

  app.get('/api/model-info', async (_req: Request, res: Response) => {
    if (pythonBackendUrl) {
      try {
        const upstream = await fetch(`${pythonBackendUrl}/api/model-info`, {
          signal: AbortSignal.timeout(3000),
        });
        if (upstream.ok) {
          const data = await upstream.json();
          res.json(data);
          return;
        }
      } catch {
        // Fall through to local metadata
      }
    }

    res.json({
      modelMode: 'demonstration',
      isCalibrated: false,
      dataset:
        'Reference epidemiological demonstration parameters (connect Python FastAPI + Scikit-learn backend for calibrated clinical dataset metrics)',
      trainedAt: null,
      models: {
        logistic_regression: { display_name: 'Logistic Regression' },
        random_forest: { display_name: 'Random Forest Classifier' },
      },
    });
  });

  app.post('/api/screenings/predict', async (req: Request, res: Response) => {
    const validation = validateScreeningBody(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }

    if (pythonBackendUrl) {
      try {
        const upstream = await fetch(`${pythonBackendUrl}/api/screenings/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validation.data),
          signal: AbortSignal.timeout(5000),
        });
        if (upstream.ok) {
          const data = await upstream.json();
          res.json(data);
          return;
        }
      } catch {
        // Fall back transparently to demonstration reference model
      }
    }

    const result = runReferenceScreening(validation.data);
    res.json(result);
  });

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Diabetes Risk Screening Assistant server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
