import type { ScreeningInputs, ScreeningResult } from '../types/screening';

const DEFAULT_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';

export function sanitizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only HTTP or HTTPS URLs are permitted.');
    }
    return parsed.origin;
  } catch {
    throw new Error('Please enter a valid http:// or https:// backend URL.');
  }
}

export function getConfiguredApiBase(): string {
  if (typeof window === 'undefined') return DEFAULT_BASE_URL;
  const saved = window.localStorage.getItem('drsa_custom_api_url');
  if (saved && saved.trim()) {
    try {
      return sanitizeApiBaseUrl(saved);
    } catch {
      return DEFAULT_BASE_URL;
    }
  }
  return DEFAULT_BASE_URL;
}

export async function checkBackendHealth(customBase?: string): Promise<{
  reachable: boolean;
  modelMode: 'validated_sklearn' | 'demonstration';
  pythonConnected?: boolean;
}> {
  const base = customBase !== undefined ? customBase : getConfiguredApiBase();
  try {
    const response = await fetch(`${base}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) {
      return { reachable: false, modelMode: 'demonstration' };
    }
    const data = await response.json();
    return {
      reachable: true,
      modelMode: data.modelMode === 'validated_sklearn' ? 'validated_sklearn' : 'demonstration',
      pythonConnected: Boolean(data.pythonConnected),
    };
  } catch {
    return { reachable: false, modelMode: 'demonstration' };
  }
}

export async function runDiabetesScreening(inputs: ScreeningInputs): Promise<ScreeningResult> {
  const base = getConfiguredApiBase();
  let response: Response;
  try {
    response = await fetch(`${base}/api/screenings/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputs),
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new Error(
        'The screening server took too long to respond. Please check your internet connection and try again.'
      );
    }
    throw new Error(
      'Network error: Unable to reach the screening API. Verify your connection or backend URL in Settings.'
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error('Received an invalid response from the screening service.');
  }

  if (!response.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : typeof data === 'object' && data !== null && 'detail' in data
          ? String((data as { detail: unknown }).detail)
          : 'Screening validation failed. Please review your measurements.';
    throw new Error(msg);
  }

  return data as ScreeningResult;
}
