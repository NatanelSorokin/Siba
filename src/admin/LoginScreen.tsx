import { ArrowRight, Eye, EyeOff, LogIn } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { api, type Session } from '../api';
import Confetti from '../components/Confetti';
import Logo from '../components/Logo';
import { inputClass } from './fields';

export default function LoginScreen({ onSignedIn, notice }: { onSignedIn: (s: Session) => void; notice?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => userRef.current?.focus(), []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get('username') ?? '').trim();
    const password = String(fd.get('password') ?? '');
    if (!username || !password) {
      setError('נא למלא שם משתמש וסיסמה.');
      (username ? passwordRef : userRef).current?.focus();
      return;
    }
    setBusy(true);
    setError('');
    try {
      onSignedIn(await api<Session>('/api/auth/login/', { method: 'POST', json: { username, password } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      if (passwordRef.current) passwordRef.current.value = '';
      passwordRef.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-brand-50 px-4 py-10">
      <Confetti count={70} seed={23} minRadius={2.5} maxRadius={10} className="absolute inset-0 -z-10 opacity-70" />
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-[0_30px_60px_-30px_rgb(140_15_72/0.45)] ring-1 ring-brand-100 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <Logo compact alt="" className="size-16" eager />
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">כניסה לניהול האתר</h1>
        </div>

        {notice && !error && <p className="mt-5 rounded-xl bg-sun-100 px-3.5 py-2.5 text-center text-sm font-medium text-ink-900">{notice}</p>}

        <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="login-username" className="mb-1.5 block text-sm font-semibold text-ink-900">
              שם משתמש
            </label>
            <input
              ref={userRef}
              id="login-username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              dir="ltr"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'login-error' : undefined}
              className={`${inputClass} h-12 text-right`}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-ink-900">
              סיסמה
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                dir="ltr"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
                className={`${inputClass} h-12 ps-12 text-right`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-pressed={showPassword}
                aria-label={showPassword ? 'הסתרת הסיסמה' : 'הצגת הסיסמה'}
                className="absolute start-1.5 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
              >
                {showPassword ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p id="login-error" role="alert" className="text-sm font-medium text-brand-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-600 font-semibold text-white transition-[background-color,transform] duration-200 hover:bg-brand-700 active:scale-[0.98] disabled:opacity-70"
          >
            <LogIn aria-hidden="true" className="size-5" />
            {busy ? 'מתחברים…' : 'כניסה'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-600">שכחתם את הסיסמה? מי שמנהל את המשתמשים באתר יכול לאפס אותה.</p>
        <a href="/" className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
          <ArrowRight aria-hidden="true" className="size-4" />
          חזרה לאתר
        </a>
      </div>
    </main>
  );
}
