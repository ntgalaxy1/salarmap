import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck, User, X } from "lucide-react";
import type { AdminConfig, AdminSession } from "../../types";
import { describeError } from "../../lib/github";

interface Props {
  config: AdminConfig | null;
  loadConfig: () => Promise<AdminConfig>;
  onLogin: (username: string, password: string, remember: boolean) => Promise<AdminSession>;
  onSuccess: (s: AdminSession) => void;
  onClose: () => void;
  onOpenGuide: () => void;
}

/** صفحه ورود مدیریت — نام کاربری و رمز عبور */
export default function AdminLogin({ loadConfig, onLogin, onSuccess, onClose, onOpenGuide }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    void loadConfig().catch(() => undefined);
  }, [loadConfig]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const s = await onLogin(username, password, remember);
      onSuccess(s);
    } catch (err) {
      setError(describeError(err));
      setFailedAttempts((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1350] flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-slate-900/60 animate-fade-in" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative flex max-h-[94dvh] w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl animate-sheet-up md:rounded-3xl md:animate-pop-in"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute left-3 top-3 rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          aria-label="بستن"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">ورود به مدیریت</h2>
            <p className="text-xs text-slate-500">فقط مدیر برنامه</p>
          </div>
        </div>

        <label className="mt-4 block text-xs font-bold text-slate-700">
          نام کاربری
          <div className="mt-1 flex items-center rounded-xl bg-slate-100 focus-within:ring-2 focus-within:ring-slate-900/20">
            <User className="mr-3 h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="username"
              className="h-11 w-full bg-transparent px-2 text-left text-sm outline-none"
              required
              autoFocus
            />
          </div>
        </label>

        <label className="mt-3 block text-xs font-bold text-slate-700">
          رمز عبور
          <div className="mt-1 flex items-center gap-1 rounded-xl bg-slate-100 pl-1 focus-within:ring-2 focus-within:ring-slate-900/20">
            <KeyRound className="mr-3 h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={show ? "text" : "password"}
              dir="ltr"
              autoComplete="current-password"
              className="h-11 w-full bg-transparent px-2 text-left text-sm outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-200"
              aria-label={show ? "پنهان کردن" : "نمایش"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-slate-900"
          />
          مرا روی این دستگاه به خاطر بسپار
        </label>

        {error && (
          <div className="mt-3 space-y-2">
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold leading-6 text-red-700 ring-1 ring-red-100">
              {error}
            </p>
            {failedAttempts >= 2 && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] leading-6 text-amber-900 ring-1 ring-amber-200">
                اگر رمز را قبلاً تغییر داده‌اید ولی پذیرفته نمی‌شود، این نسخه ممکن است هنوز تنظیمات رمز قبلی را داشته باشد.
                یک‌بار با نام کاربری <b dir="ltr">admin</b> و رمز <b dir="ltr">admin1234</b> وارد شوید و از بخش
                «تنظیمات ← حساب مدیر» رمز دلخواه خود را دوباره ذخیره کنید.
              </p>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-extrabold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
          {busy ? "در حال بررسی…" : "ورود"}
        </button>

        <button
          type="button"
          onClick={onOpenGuide}
          className="mt-3 text-center text-[11px] font-bold text-slate-500 underline-offset-2 hover:underline"
        >
          راهنمای بخش مدیریت
        </button>
      </form>
    </div>
  );
}
