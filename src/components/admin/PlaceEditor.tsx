import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  ChevronDown,
  Crosshair,
  ImagePlus,
  Link2,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";
import type { EditorState, PendingImage, Place } from "../../types";
import { MARKER_TYPES } from "../../data/mapConfig";
import { compressImage, estimateBytes, formatBytes, newImageName } from "../../lib/image";
import { isPendingRef, pendingIdOf, pendingRef } from "../../lib/placesStore";
import { uid } from "../../lib/storage";
import { toFa } from "../../utils/geo";
import { cn } from "../../utils/cn";

interface Props {
  state: EditorState;
  onChange: (next: EditorState) => void;
  resolveImage: (src: string) => string;
  onPickLocation: () => void;
  onSave: () => void;
  onCancel: () => void;
  onToast: (msg: string) => void;
}

const input =
  "mt-1 h-11 w-full rounded-xl bg-slate-100 px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900/20 placeholder:text-slate-400";
const textarea =
  "mt-1 w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm leading-7 outline-none focus:ring-2 focus:ring-slate-900/20 placeholder:text-slate-400";

/** فرم افزودن / ویرایش مکان (پنل مدیریت) */
export default function PlaceEditor({ state, onChange, resolveImage, onPickLocation, onSave, onCancel, onToast }: Props) {
  const { place, pending, isNew } = state;
  const [urlInput, setUrlInput] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [moreOpen, setMoreOpen] = useState(Boolean(place.address || place.phone || place.hours || place.website || place.nameEn));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<Place>) => onChange({ ...state, place: { ...place, ...p } });

  const errors: string[] = [];
  if (!place.name.trim()) errors.push("نام مکان الزامی است");
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) errors.push("مختصات را وارد کنید یا روی نقشه انتخاب کنید");

  // ── تصاویر
  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setCompressing(true);
    const newPending: PendingImage[] = [];
    let failed = 0;
    for (const f of Array.from(files)) {
      try {
        const dataUrl = await compressImage(f);
        newPending.push({ id: uid(), dataUrl, fileName: newImageName(place.id) });
      } catch {
        failed++;
      }
    }
    setCompressing(false);
    if (failed) onToast(`${toFa(failed)} فایل قابل خواندن نبود`);
    if (newPending.length === 0) return;
    onChange({
      ...state,
      place: { ...place, images: [...place.images, ...newPending.map((p) => pendingRef(p.id))] },
      pending: [...pending, ...newPending],
    });
  };

  const addUrl = () => {
    const u = urlInput.trim();
    if (!/^https?:\/\//i.test(u)) {
      onToast("لینک باید با http:// یا https:// شروع شود");
      return;
    }
    patch({ images: [...place.images, u] });
    setUrlInput("");
  };

  const removeImage = (i: number) => {
    const src = place.images[i];
    const images = place.images.filter((_, idx) => idx !== i);
    const nextPending = isPendingRef(src) ? pending.filter((p) => p.id !== pendingIdOf(src)) : pending;
    onChange({ ...state, place: { ...place, images }, pending: nextPending });
  };

  const moveImage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= place.images.length) return;
    const images = [...place.images];
    [images[i], images[j]] = [images[j], images[i]];
    patch({ images });
  };

  const pendingBytes = pending.reduce((s, p) => s + estimateBytes(p.dataUrl), 0);
  const kindDef = MARKER_TYPES.green;

  return (
    <div className="fixed inset-0 z-[1250] flex flex-col bg-white animate-sheet-up md:inset-y-0 md:left-auto md:right-0 md:w-[480px] md:animate-panel-in md:shadow-2xl">
      {/* هدر */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={() => {
            if (!confirmCancel) {
              setConfirmCancel(true);
              setTimeout(() => setConfirmCancel(false), 2500);
              return;
            }
            onCancel();
          }}
          className={cn(
            "flex h-10 items-center gap-1 rounded-xl px-3 text-xs font-bold transition",
            confirmCancel ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          )}
        >
          <X className="h-4 w-4" />
          {confirmCancel ? "تأیید انصراف؟" : "انصراف"}
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="truncate text-base font-extrabold text-slate-900">{isNew ? "افزودن مکان جدید" : "ویرایش مکان"}</h2>
          <p className="text-[11px] text-slate-500">پنل مدیریت</p>
        </div>
        <button
          onClick={onSave}
          disabled={errors.length > 0 || compressing}
          className="flex h-10 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 disabled:opacity-50 disabled:shadow-none"
        >
          <Save className="h-4 w-4" />
          ذخیره
        </button>
      </div>

      {/* فرم */}
      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {errors.length > 0 && (
          <ul className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold leading-6 text-amber-800 ring-1 ring-amber-100">
            {errors.map((e) => (
              <li key={e}>• {e}</li>
            ))}
          </ul>
        )}

        {/* نام مکان */}
        <section className="space-y-3">
          <label className="block text-xs font-bold text-slate-600">
            نام مکان *
            <input
              value={place.name}
              onChange={(e) => patch({ name: e.target.value, kind: "green" })}
              className={input}
              placeholder="مثلاً: فروشگاه مرکزی"
              autoFocus={isNew}
            />
          </label>
        </section>

        {/* موقعیت */}
        <section className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">مختصات *</h3>
          <button
            type="button"
            onClick={onPickLocation}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-extrabold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
          >
            <Crosshair className="h-5 w-5" style={{ color: kindDef.color }} />
            {Number.isFinite(place.lat) ? "تغییر موقعیت روی نقشه" : "انتخاب موقعیت روی نقشه"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs font-bold text-slate-600">
              عرض جغرافیایی (lat)
              <input
                type="number"
                step="0.000001"
                value={Number.isFinite(place.lat) ? place.lat : ""}
                onChange={(e) => patch({ lat: parseFloat(e.target.value) })}
                className={cn(input, "text-left font-mono")}
                dir="ltr"
                placeholder="38.07"
              />
            </label>
            <label className="block text-xs font-bold text-slate-600">
              طول جغرافیایی (lng)
              <input
                type="number"
                step="0.000001"
                value={Number.isFinite(place.lng) ? place.lng : ""}
                onChange={(e) => patch({ lng: parseFloat(e.target.value) })}
                className={cn(input, "text-left font-mono")}
                dir="ltr"
                placeholder="46.29"
              />
            </label>
          </div>
          <p className="text-[11px] leading-5 text-slate-400">
            می‌توانید مختصات را از گوگل‌مپ کپی کنید (انگشت را روی نقطه نگه دارید) و اینجا وارد کنید.
          </p>
        </section>

        {/* توضیحات */}
        <section className="space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900">توضیحات</h3>
          <label className="block text-xs font-bold text-slate-600">
            توضیح کوتاه (یک خط)
            <input
              value={place.short}
              onChange={(e) => patch({ short: e.target.value })}
              className={input}
              placeholder="زیر نام مکان و در لیست نمایش داده می‌شود"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            توضیح کامل
            <textarea
              value={place.description}
              onChange={(e) => patch({ description: e.target.value })}
              className={textarea}
              rows={5}
              placeholder="هر توضیحی که کاربر باید درباره این مکان ببیند…"
            />
          </label>
        </section>

        {/* تصاویر */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">تصاویر</h3>
            {pendingBytes > 0 && (
              <span className="text-[11px] text-slate-500">
                {toFa(pending.length)} عکس جدید — {formatBytes(pendingBytes)}
              </span>
            )}
          </div>

          {place.images.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-xs text-slate-400">
              هنوز تصویری اضافه نشده
            </div>
          ) : (
            <ul className="space-y-2">
              {place.images.map((src, i) => (
                <li key={src + i} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-2 ring-1 ring-slate-100">
                  <img src={resolveImage(src)} alt="" className="h-16 w-20 shrink-0 rounded-xl bg-slate-200 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-slate-600" dir="ltr">
                      {isPendingRef(src) ? "📷 عکس جدید (منتشرنشده)" : src}
                    </p>
                    {i === 0 && (
                      <span className="mt-1 inline-block rounded-full bg-slate-900 px-2 py-px text-[10px] font-bold text-white">
                        تصویر اصلی
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveImage(i, -1)}
                      disabled={i === 0}
                      className="rounded-lg bg-white p-1.5 text-slate-600 ring-1 ring-slate-200 disabled:opacity-30"
                      aria-label="بالا"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(i, 1)}
                      disabled={i === place.images.length - 1}
                      className="rounded-lg bg-white p-1.5 text-slate-600 ring-1 ring-slate-200 disabled:opacity-30"
                      aria-label="پایین"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="shrink-0 rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100"
                    aria-label="حذف تصویر"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={compressing}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {compressing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              از گالری
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={compressing}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-800 hover:bg-slate-200 disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              عکس با دوربین
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
              className={cn(input, "mt-0 text-left")}
              dir="ltr"
              placeholder="https://… (لینک تصویر اینترنتی)"
            />
            <button
              type="button"
              onClick={addUrl}
              className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-slate-100 px-3 text-xs font-bold text-slate-800 hover:bg-slate-200"
            >
              <Link2 className="h-4 w-4" />
              افزودن
            </button>
          </div>
          <p className="text-[11px] leading-5 text-slate-400">
            عکس‌ها خودکار فشرده می‌شوند (حداکثر ۱۲۸۰ پیکسل). اولین عکس، تصویر اصلی در لیست است.
          </p>
        </section>

        {/* اطلاعات بیشتر (اختیاری) */}
        <section className="rounded-2xl ring-1 ring-slate-200">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-extrabold text-slate-900"
          >
            اطلاعات بیشتر (اختیاری)
            <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", moreOpen && "rotate-180")} />
          </button>
          {moreOpen && (
            <div className="space-y-3 border-t border-slate-100 px-4 py-4 animate-fade-in">
              <label className="block text-xs font-bold text-slate-600">
                آدرس
                <input
                  value={place.address ?? ""}
                  onChange={(e) => patch({ address: e.target.value || undefined })}
                  className={input}
                  placeholder="تبریز، خیابان …"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs font-bold text-slate-600">
                  تلفن
                  <input
                    value={place.phone ?? ""}
                    onChange={(e) => patch({ phone: e.target.value || undefined })}
                    className={cn(input, "text-left")}
                    dir="ltr"
                    inputMode="tel"
                    placeholder="041-3xxxxxxx"
                  />
                </label>
                <label className="block text-xs font-bold text-slate-600">
                  ساعت کار
                  <input
                    value={place.hours ?? ""}
                    onChange={(e) => patch({ hours: e.target.value || undefined })}
                    className={input}
                    placeholder="۹ تا ۱۸"
                  />
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-600">
                وب‌سایت
                <input
                  value={place.website ?? ""}
                  onChange={(e) => patch({ website: e.target.value || undefined })}
                  className={cn(input, "text-left")}
                  dir="ltr"
                  inputMode="url"
                  placeholder="https://"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                نام انگلیسی
                <input
                  value={place.nameEn ?? ""}
                  onChange={(e) => patch({ nameEn: e.target.value || undefined })}
                  className={cn(input, "text-left")}
                  dir="ltr"
                  placeholder="English name"
                />
              </label>
            </div>
          )}
        </section>

        {/* پیش‌نمایش */}
        <section className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
          <p className="mb-2 text-[11px] font-bold text-slate-400">پیش‌نمایش در لیست</p>
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-200">
              {place.images[0] ? (
                <img src={resolveImage(place.images[0])} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-400">—</div>
              )}
              <span
                className="absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white"
                style={{ background: kindDef.color }}
              />
            </div>
            <div className="min-w-0">
              <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: kindDef.color }}>
                {kindDef.label}
              </span>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">{place.name || "نام مکان"}</p>
              <p className="truncate text-xs text-slate-500">{place.short || "توضیح کوتاه"}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
