import type { Place } from "../types";

/** یکسان‌سازی حروف فارسی/عربی و ارقام برای جستجو */
export function normalizeFa(s: string): string {
  return s
    .toLowerCase()
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u064B-\u0652\u0670]/g, "") // اعراب
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[\u200c\u200f\u200e]/g, " ")
    .trim();
}

/** جستجوی ساده در نام، توضیح و آدرس — همه کلمات باید پیدا شوند */
export function matchesPlace(p: Place, query: string): boolean {
  const q = normalizeFa(query);
  if (!q) return true;
  const hay = normalizeFa([p.name, p.nameEn, p.short, p.description, p.address].filter(Boolean).join(" "));
  return q.split(/\s+/).every((w) => hay.includes(w));
}
