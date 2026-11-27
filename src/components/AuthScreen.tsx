import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  Lock,
  Mail,
  Moon,
  Phone,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { auth } from '../lib/firebase';
import type { ThemeMode } from '../types/screening';

interface AuthScreenProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenLegal: (section: 'privacy' | 'about') => void;
  onPhoneSignIn: (normalizedPhone: string) => void;
}

type AuthTab = 'phone' | 'email';
type EmailMode = 'login' | 'register';

const COUNTRY_CODES = [
  { label: 'US / CA (+1)', code: '+1' },
  { label: 'India (+91)', code: '+91' },
  { label: 'UK (+44)', code: '+44' },
  { label: 'Australia (+61)', code: '+61' },
  { label: 'Germany (+49)', code: '+49' },
  { label: 'Singapore (+65)', code: '+65' },
  { label: 'UAE (+971)', code: '+971' },
  { label: 'Other (+)', code: '+' },
];

function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code: unknown }).code)
      : '';

  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'this domain';

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not yet enabled in Firebase Console (Authentication -> Sign-in method). Enable Phone / Email-Password in Firebase Console, or sign in immediately with Google below.';
    case 'auth/unauthorized-domain':
      return `Domain "${hostname}" is not authorized for Phone OTP / OAuth in Firebase Console. Add "${hostname}" under Authentication -> Settings -> Authorized domains.`;
    case 'auth/captcha-check-failed':
    case 'auth/missing-client-identifier':
      return 'reCAPTCHA verification could not complete. Please refresh or check that your domain is authorized in Firebase Console.';
    case 'auth/app-not-authorized':
      return 'This app is not authorized to use Firebase Authentication on this domain. Verify Firebase Console settings.';
    case 'auth/invalid-phone-number':
    case 'auth/missing-phone-number':
      return 'Please enter a valid phone number with country code (e.g., +15551234567).';
    case 'auth/invalid-verification-code':
      return 'The 6-digit verification code is incorrect. Please check your SMS and try again.';
    case 'auth/code-expired':
      return 'This verification code has expired. Tap Resend Code to request a new SMS OTP.';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'Too many SMS verification attempts right now. Please wait a few minutes or sign in with Google.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Switch to Sign In instead.';
    case 'auth/weak-password':
      return 'Please choose a stronger password (at least 8 characters).';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing authentication.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase Authentication. Check your connection.';
    default:
      return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
  }
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  theme,
  onToggleTheme,
  onOpenLegal,
  onPhoneSignIn,
}) => {
  const [authTab, setAuthTab] = useState<AuthTab>('phone');
  const [emailMode, setEmailMode] = useState<EmailMode>('login');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Phone sign-in state
  const [countryCode, setCountryCode] = useState('+1');
  const [phoneLocal, setPhoneLocal] = useState('');

  // Email / Password state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const buildE164Phone = (): string => {
    const raw = phoneLocal.trim();
    if (raw.startsWith('+')) {
      return '+' + raw.slice(1).replace(/\D/g, '');
    }
    const digits = raw.replace(/\D/g, '');
    const prefix = countryCode === '+' ? '+' : countryCode;
    return `${prefix}${digits}`;
  };

  const handlePhoneLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    const normalized = buildE164Phone();
    if (!/^\+[1-9]\d{6,14}$/.test(normalized)) {
      setErrorMsg(
        'Enter a valid phone number (7–15 digits with country code, e.g., +15551234567).'
      );
      return;
    }

    onPhoneSignIn(normalized);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      if (emailMode === 'register') {
        if (password.length < 8) {
          setErrorMsg('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (fullName.trim()) {
          await updateProfile(cred.user, { displayName: fullName.trim().slice(0, 80) });
        }
        await sendEmailVerification(cred.user);
        setInfoMsg(
          'Account created. Please check your inbox and click the verification link before saving screening history.'
        );
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user);
          setInfoMsg(
            'Your email is not verified yet. We sent a fresh verification link to your inbox.'
          );
        }
      }
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Compact Welcome Top Bar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-6xl w-full mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <HeartPulse className="w-4 h-4" />
            </div>
            <span className="text-sm sm:text-base font-bold tracking-tight truncate">
              Diabetes Risk Screening Assistant
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full min-w-0 mx-auto px-4 sm:px-6 py-5 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch">
        {/* Left: Welcome & Clinical Overview */}
        <section className="lg:col-span-6 min-w-0 flex flex-col justify-between rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 space-y-6">
          <div className="space-y-4">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Preliminary Screening · Educational Health Tool
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
              Understand your diabetes risk factors in minutes.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Enter your age, blood glucose, weight, height, and blood pressure to receive
              transparent machine learning risk insights and plain-language preventive guidance.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-800 aspect-[4/3]">
            {!heroImgFailed ? (
              <img
                src="/src/assets/images/welcome_medical_hero_1795759920816.jpg"
                alt="Medical glucose monitoring and wellness illustration"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-3">
                <Activity className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Evidence-Based Metabolic Screening
                </p>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Consent-first history · Zero third-party sharing
            </span>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onOpenLegal('privacy')}
                className="underline hover:text-slate-900 dark:hover:text-white min-h-[44px] px-1"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onOpenLegal('about')}
                className="underline hover:text-slate-900 dark:hover:text-white min-h-[44px] px-1"
              >
                About App
              </button>
            </div>
          </div>
        </section>

        {/* Right: Authentication Card */}
        <section className="lg:col-span-6 min-w-0 flex flex-col justify-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Sign in or create account
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Verify your identity with a real authentication provider to protect your health records.
            </p>
          </div>

          {/* Auth Method Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthTab('phone');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`min-w-0 min-h-[44px] px-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-colors truncate ${
                authTab === 'phone'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span className="truncate">Phone Number</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthTab('email');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`min-w-0 min-h-[44px] px-2 rounded-lg text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-colors truncate ${
                authTab === 'email'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Mail className="w-4 h-4 shrink-0" />
              <span className="truncate">Email & Password</span>
            </button>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3.5 flex items-start gap-2.5 text-sm text-red-700 dark:text-red-300"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 p-3.5 flex items-start gap-2.5 text-sm text-blue-800 dark:text-blue-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          {authTab === 'phone' ? (
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="phone-input" className="block text-sm font-medium">
                  Phone Number
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    aria-label="Country code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full sm:w-40 min-h-[48px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 shrink-0"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.label} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <input
                    id="phone-input"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder={countryCode === '+' ? '+15551234567' : '5551234567'}
                    className="w-full min-w-0 flex-1 min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono-tabular text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter your mobile number with country code to sign in directly without verification
                  delays.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                Continue with Phone Number
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  {emailMode === 'login' ? 'Sign in to your account' : 'Create a new account'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode(emailMode === 'login' ? 'register' : 'login');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline min-h-[44px] px-1"
                >
                  {emailMode === 'login' ? 'Need an account? Register' : 'Already registered? Sign In'}
                </button>
              </div>

              {emailMode === 'register' && (
                <div className="space-y-1.5">
                  <label htmlFor="name-input" className="block text-sm font-medium">
                    Display Name
                  </label>
                  <input
                    id="name-input"
                    type="text"
                    maxLength={80}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="email-input" className="block text-sm font-medium">
                  Email Address
                </label>
                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password-input" className="block text-sm font-medium">
                  Password
                </label>
                <input
                  id="password-input"
                  type="password"
                  autoComplete={emailMode === 'register' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
              >
                <Lock className="w-4 h-4" />
                {loading
                  ? 'Please wait...'
                  : emailMode === 'login'
                    ? 'Sign In'
                    : 'Create Verified Account'}
              </button>
            </form>
          )}

          {/* Divider + Instant Google Sign-In */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white dark:bg-slate-900 px-3 text-slate-500 dark:text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white text-sm font-medium inline-flex items-center justify-center gap-2.5 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            Educational preliminary screening only. Never used to diagnose medical conditions.
          </p>
        </section>
      </main>
    </div>
  );
};
