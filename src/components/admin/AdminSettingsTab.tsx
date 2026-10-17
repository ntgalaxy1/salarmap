import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
import type { AdminPrefs } from "../../types";
import type { AdminApi } from "../../hooks/useAdmin";
import type { PlacesApi } from "../../hooks/usePlaces";
import { MIN_PASSWORD } from "../../lib/adminConfig";
import { describeError } from "../../lib/github";
import { toFa } from "../../utils/geo";
import { cn } from "../../utils/cn";

interface Props {
  admin: AdminApi;
  store: PlacesApi;
  prefs: AdminPrefs;
  onPrefs: (p: AdminPrefs) => void;
  onToast: (msg: string) => void;
  onGuide: () => void;
}

const field =
  "mt-1 h-11 w-full rounded-xl bg-slate-100 px-3 text-left text-sm outline-none focus:ring-2 focus:ring-slate-900/20";

/** تب تنظیمات پنل مدیریت — طراحی مدرن، ساده و حرفه‌ای بدون ابزارهای فنی */
export default function AdminSettingsTab({ admin, store, onToast, onGuide }: Props) {
  const session = admin.session!;
  const hasPendingChanges = store.changeCount > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 pb-32">
      {/* کارت وضعیت انتشار */}
      <section
        className={cn(
          "flex items-start gap-3.5 rounded-2xl p-4 shadow-sm ring-1",
          hasPendingChanges
            ? "bg-amber-50/90 ring-amber-200"
            : "bg-emerald-50/90 ring-emerald-200"
        )}
      >
        {hasPendingChanges ? (
          <Clock className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        )}
        <div className="min-w-0 flex-1 text-xs leading-6">
          {hasPendingChanges ? (
            <>
              <p className="text-sm font-extrabold text-amber-950">
                {toFa(store.changeCount)} تغییر ذخیره شده و آماده انتشار است
              </p>
              <p className="mt-1 text-amber-900">
                تغییرات شما به‌صورت پیش‌نویس ذخیره شده‌اند و هنوز برای کاربران نمایش داده نمی‌شوند. برای اعمال نهایی، روی
                دکمه <b>«تأیید و انتشار نهایی»</b> در پایین صفحه بزنید.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-extrabold text-emerald-950">
                تمام تغییرات منتشر شده است
              </p>
              <p className="mt-1 text-emerald-900">
                اطلاعات نقشه به‌روز است و تمامی مکان‌های ثبت‌شده در نمای کاربران قابل مشاهده هستند.
              </p>
            </>
          )}
        </div>
      </section>

      {/* بخش تغییر نام کاربری و رمز عبور مدیر */}
      <AccountSection admin={admin} onToast={onToast} />

      {/* بخش لغو تغییرات منتشرنشده (در صورت وجود پیش‌نویس) */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Trash2 className="h-4 w-4 text-slate-500" />
          مدیریت پیش‌نویس تغییرات
        </h3>
        <p className="mt-1 text-xs leading-6 text-slate-600">
          {hasPendingChanges
            ? `شما ${toFa(store.changeCount)} تغییر منتشرنشده دارید. در صورت تمایل می‌توانید قبل از انتشار نهایی، آن‌ها را لغو کنید و به آخرین نسخه منتشرشده برگردید.`
            : "در حال حاضر هیچ تغییر منتشرنشده‌ای در پیش‌نویس وجود ندارد."}
        </p>
        {hasPendingChanges && <DiscardButton onDiscard={store.discardDraft} onToast={onToast} />}
      </section>

      {/* راهنمای کاربری */}
      <section className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900">راهنمای سالار مپ</p>
            <p className="text-xs text-slate-500">آشنایی با امکانات نقشه و بخش مدیریت ({session.username})</p>
          </div>
        </div>
        <button
          onClick={onGuide}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-extrabold text-slate-800 hover:bg-slate-200"
        >
          <BookOpen className="h-4 w-4" />
          مشاهده راهنما
        </button>
      </section>
    </div>
  );
}

/* ───────────── بخش حساب مدیر ───────────── */
function AccountSection({ admin, onToast }: { admin: AdminApi; onToast: (m: string) => void }) {
  const [open, setOpen] = useState(true);
  const [current, setCurrent] = useState("");
  const [username, setUsername] = useState(admin.session?.username ?? "");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw1 !== pw2) {
      setError("تکرار رمز عبور جدید یکسان نیست");
      return;
    }
    setBusy(true);
    try {
      await admin.changeCredentials(current, username, pw1);
      onToast("نام کاربری و رمز عبور مدیر با موفقیت تغییر کرد");
      setCurrent("");
      setPw1("");
      setPw2("");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 px-4 py-4 text-right">
        <UserCog className="h-4 w-4 text-slate-500" />
        <span className="flex-1">
          <span className="block text-sm font-extrabold text-slate-900">تغییر نام کاربری و رمز عبور مدیر</span>
          <span className="block text-[11px] text-slate-500">
            نام کاربری فعلی: <b dir="ltr">{admin.session?.username}</b>
          </span>
        </span>
        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", open && "rotate-180")} />
      </button>
      {open && (
        <form onSubmit={submit} className="space-y-3 border-t border-slate-100 px-4 py-4 animate-fade-in">
          {admin.session?.isDefault && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>برای امنیت بیشتر، پیشنهاد می‌شود نام کاربری و رمز عبور پیش‌فرض را تغییر دهید.</span>
            </div>
          )}
          <label className="block text-xs font-bold text-slate-600">
            رمز عبور فعلی
            <input
              type={show ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={field}
              dir="ltr"
              autoComplete="current-password"
              required
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            نام کاربری جدید
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={field}
              dir="ltr"
              autoCapitalize="off"
              autoComplete="username"
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-600">
              رمز عبور جدید
              <input
                type={show ? "text" : "password"}
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
                className={field}
                dir="ltr"
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                required
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              تکرار رمز جدید
              <input
                type={show ? "text" : "password"}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className={field}
                dir="ltr"
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                required
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500"
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {show ? "پنهان کردن رمزها" : "نمایش رمزها"}
          </button>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            ذخیره نام کاربری و رمز جدید
          </button>
        </form>
      )}
    </section>
  );
}

function DiscardButton({ onDiscard, onToast }: { onDiscard: () => void; onToast: (m: string) => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <button
      onClick={() => {
        if (!confirm) {
          setConfirm(true);
          setTimeout(() => setConfirm(false), 3000);
          return;
        }
        onDiscard();
        onToast("تغییرات منتشرنشده لغو شد");
        setConfirm(false);
      }}
      className={cn(
        "mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition",
        confirm ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"
      )}
    >
      <Trash2 className="h-4 w-4" />
      {confirm ? "مطمئنید؟ برای لغو تغییرات دوباره بزنید" : "لغو تغییرات منتشرنشده"}
    </button>
  );
}
