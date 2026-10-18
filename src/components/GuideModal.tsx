import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Eye,
  Globe,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import { toFa } from "../utils/geo";
import { cn } from "../utils/cn";

interface Props {
  onClose: () => void;
  onInstall?: () => void;
  isAdmin: boolean;
  onAdminLogin: () => void;
}

type Tab = "about" | "admin";

/** راهنمای کاربری و مدیریتی سالار مپ — بدون هیچ‌گونه اصطلاح یا ابزار فنی */
export default function GuideModal({ onClose, onInstall, isAdmin, onAdminLogin }: Props) {
  const [tab, setTab] = useState<Tab>(isAdmin ? "admin" : "about");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 bg-slate-900/50 animate-fade-in" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-3xl bg-white shadow-2xl animate-sheet-up md:max-h-[88vh] md:rounded-3xl md:animate-pop-in">
        {/* هدر */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 pb-3 pt-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <MapPin className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-extrabold text-slate-900">راهنمای سالار مپ</h2>
            <p className="text-xs text-slate-500">نقشه تعاملی مکان‌ها و پنل مدیریت</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* تب‌ها */}
        <div className="flex gap-2 border-b border-slate-100 px-5 py-2.5">
          <button
            onClick={() => setTab("about")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition",
              tab === "about" ? "bg-slate-900 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <Eye className="h-4 w-4" />
            راهنمای نقشه (کاربران)
          </button>
          <button
            onClick={() => setTab("admin")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition",
              tab === "admin" ? "bg-slate-900 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            راهنمای پنل مدیریت
          </button>
        </div>

        {/* محتوا */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-sm leading-7 text-slate-700">
          {tab === "about" ? (
            <>
              {onInstall && (
                <button
                  onClick={onInstall}
                  className="flex w-full items-center gap-3 rounded-2xl bg-slate-900 p-3.5 text-right text-white hover:bg-slate-800"
                >
                  <Smartphone className="h-6 w-6 shrink-0 text-emerald-400" />
                  <span>
                    <span className="block font-extrabold">نصب سالار مپ روی صفحه اصلی گوشی</span>
                    <span className="block text-[11px] text-slate-300">دسترسی سریع و تمام‌صفحه</span>
                  </span>
                </button>
              )}

              <p>
                <b>سالار مپ</b> مکان‌های ثبت‌شده را با نشانگرهای <b style={{ color: "#16a34a" }}>سبز</b> روی نقشه کامل
                گوگل نشان می‌دهد. با لمس هر نشانگر، توضیحات، مشخصات و گالری تصاویر آن مکان باز می‌شود.
              </p>

              <ul className="list-disc space-y-2 pr-5 text-xs leading-6">
                <li>
                  <b>بزرگ‌نمایی و حرکت آزاد:</b> با دو انگشت روی نقشه، دوبار ضربه، یا دکمه‌های + و − کنار صفحه می‌توانید
                  روی هر نقطه زوم کنید.
                </li>
                <li>
                  <b>بازگشت به مرکز تبریز:</b> هنگام باز شدن برنامه، نقشه روی تبریز قرار می‌گیرد و با دکمه خانه (🏠) در
                  هر زمان به مرکز تبریز برمی‌گردد.
                </li>
                <li>
                  <b>جستجو و فهرست مکان‌ها:</b> نام مکان را در کادر بالای صفحه جستجو کنید یا از دکمه فهرست (☰) لیست کامل
                  مکان‌ها را مشاهده نمایید.
                </li>
                <li>
                  <b>تغییر نوع نقشه:</b> از دکمه لایه‌ها بین نقشه خیابانی گوگل، ماهواره‌ای، ترکیبی و توپوگرافی جابه‌جا
                  شوید.
                </li>
                <li>
                  <b>مسیریابی و اشتراک‌گذاری:</b> در انتهای پنجره اطلاعات هر مکان، دکمه‌های «مسیریابی»، «گوگل مپ» و
                  «اشتراک» قرار دارند.
                </li>
              </ul>

              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-200">
                <Globe className="h-5 w-5 shrink-0 text-slate-500" />
                <p className="text-xs leading-6 text-slate-600">
                  برای بارگذاری کاشی‌های نقشه گوگل به اتصال اینترنت نیاز است.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 p-4 text-white">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-extrabold">
                      {isAdmin ? "شما در حالت مدیر هستید" : "ورود به پنل مدیریت"}
                    </p>
                    <p className="text-xs text-slate-300">
                      مدیریت مکان‌ها، تصاویر، کاتالوگ و انتشار نهایی
                    </p>
                  </div>
                </div>
                {!isAdmin && (
                  <button
                    onClick={onAdminLogin}
                    className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-emerald-400"
                  >
                    ورود مدیر
                  </button>
                )}
              </div>

              <Step n={1} title="افزودن، ویرایش و ذخیره اولیه">
                <p className="text-xs leading-6">
                  در پنل مدیریت می‌توانید مکان جدید اضافه کنید، مختصات را از روی نقشه یا به‌صورت عددی وارد کنید و تصاویر
                  و توضیحات را ثبت نمایید. با زدن دکمه <b>«ذخیره»</b>، تغییرات شما ابتدا به‌صورت پیش‌نویس ذخیره می‌شوند.
                </p>
              </Step>

              <Step n={2} title="تأیید و انتشار نهایی">
                <p className="text-xs leading-6">
                  تا زمانی که روی دکمه <b>«تأیید و انتشار نهایی»</b> در نوار ثابت پایین صفحه مدیریت نزنید، تغییرات در
                  نمای کاربران منتشر نمی‌شوند. پس از اتمام ویرایش‌ها، روی <b>«تأیید و انتشار نهایی»</b> بزنید و در پنجره
                  تأیید، گزینه <b>«تأیید و انتشار»</b> را انتخاب کنید.
                </p>
              </Step>

              <Step n={3} title="کاتالوگ عکس (خروجی تصویری)">
                <p className="text-xs leading-6">
                  با زدن دکمه <Sparkles className="inline h-3.5 w-3.5 text-emerald-600" /> <b>«کاتالوگ عکس»</b> در بالای
                  پنل مدیریت، می‌توانید یک پوستر و کاتالوگ تصویری خلاصه و شیک از مکان‌ها بسازید، پیش‌نمایش آن را ببینید
                  و مستقیم ارسال یا ذخیره کنید.
                </p>
              </Step>

              <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 p-3.5 text-xs text-emerald-900 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <span>
                  در تب <b>«تنظیمات»</b> می‌توانید نام کاربری و رمز عبور مدیریت را در هر زمان تغییر دهید.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs text-white">
          {toFa(n)}
        </span>
        <span>{title}</span>
      </h3>
      <div className="pr-8">{children}</div>
    </section>
  );
}
