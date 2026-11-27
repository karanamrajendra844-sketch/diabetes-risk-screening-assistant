export type ModelType = 'logistic_regression' | 'random_forest';
export type ModelName = 'Logistic Regression' | 'Random Forest Classifier';
export type ModelMode = 'validated_sklearn' | 'demonstration';
export type RiskCategory =
  | 'Lower estimated risk'
  | 'Elevated estimated risk'
  | 'Higher estimated risk';

export type ThemeMode = 'light' | 'dark';
export type ActiveTab = 'home' | 'screen' | 'history' | 'education' | 'settings';

export interface ScreeningInputs {
  age: number;
  glucose: number;
  bmi: number;
  bloodPressure: number;
  modelType: ModelType;
}

export interface FeatureContributions {
  glucose: number;
  bmi: number;
  age: number;
  bloodPressure: number;
}

export interface ModelEvaluationMetrics {
  accuracy: number;
  roc_auc: number;
  precision: number;
  recall: number;
  f1_score: number;
  brier_score: number;
}

export interface ScreeningResult {
  riskCategory: RiskCategory;
  riskPercentage: number;
  modelName: ModelName;
  modelMode: ModelMode;
  isCalibrated: boolean;
  calibratedProbability: number | null;
  contributions: FeatureContributions;
  topFactors: string[];
  explanation: string;
  recommendation: string;
  disclaimer: string;
  inputs: ScreeningInputs;
  modelMetrics?: ModelEvaluationMetrics | null;
}

export interface ScreeningRecord {
  id: string;
  uid: string;
  age: number;
  glucose: number;
  bmi: number;
  bloodPressure: number;
  modelName: ModelName;
  modelMode: ModelMode;
  riskCategory: RiskCategory;
  isCalibrated: boolean;
  calibratedProbability?: number;
  glucoseContribution: number;
  bmiContribution: number;
  ageContribution: number;
  bpContribution: number;
  topFactors: string[];
  explanation: string;
  recommendation: string;
  createdAtMs: number;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  saveHistoryConsent: boolean;
  preferredModel: ModelType;
  theme: ThemeMode;
}

export interface UserPrivateInfo {
  uid: string;
  email: string;
  phoneNumber: string;
  authProvider: 'phone' | 'google.com' | 'password';
}
