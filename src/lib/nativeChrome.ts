/**
 * تنظیم نوار وضعیت (Status Bar) اندروید و فضای امن بالای صفحه در نسخه APK
 *
 * مشکل: در اپ اندروید، نوار وضعیت سیستم (ساعت، باتری، آنتن) روی محتوای برنامه می‌آمد
 * و هدر و دکمه‌ها با آن تداخل داشتند. عناصر fixed نیز نسبت به کل صفحه جای می‌گیرند
 * و ممکن است زیر نوار وضعیت بروند.
 *
 * راه‌حل (چندلایه):
 *  ۱) رنگ نوار وضعیت را هماهنگ و محتوا را از زیر آن خارج می‌کنیم.
 *  ۲) ارتفاع واقعی نوار وضعیت را اندازه می‌گیریم و در متغیر CSS `--salar-safe-top` ثبت می‌کنیم
 *     تا همهٔ هدرها (حتی fixed) دقیقاً زیر نوار وضعیت قرار بگیرند.
 *  ۳) در صورت تغییر وضعیت (چرخش صفحه، بازگشت به برنامه) مقدار را دوباره محاسبه می‌کنیم.
 */
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/** اندازه‌گیری ارتفاع واقعی نوار وضعیت و ثبت در متغیر CSS */
function measureAndApplySafeTop(): void {
  const probe = document.createElement("div");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top,0px);pointer-events:none;visibility:hidden;";
  document.body.appendChild(probe);
  const inset = Math.round(probe.getBoundingClientRect().height);
  probe.remove();

  // اگر مرورگر inset را اعلام نکرد (۰) ولی در اپ بومی هستیم، ارتفاع استاندارد نوار وضعیت اندروید
  const fallback = Capacitor.isNativePlatform() ? 30 : 0;
  const safeTop = inset > 4 ? inset : fallback;

  document.documentElement.style.setProperty("--salar-safe-top", `${safeTop}px`);
}

export async function initNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // محاسبه اولیه و همچنین پس از آماده شدن کامل برنامه
  measureAndApplySafeTop();
  window.setTimeout(measureAndApplySafeTop, 120);
  window.addEventListener("resize", measureAndApplySafeTop);
  document.addEventListener("resume", measureAndApplySafeTop);

  try {
    // محتوا دیگر زیر نوار وضعیت سیستم کشیده نمی‌شود
    await StatusBar.setOverlaysWebView({ overlay: false });
    // رنگ نوار وضعیت همان رنگ هدر برنامه تا یکپارچگی بصری داشته باشد
    await StatusBar.setBackgroundColor({ color: "#0f172a" });
    await StatusBar.setStyle({ style: Style.Dark });
    // پس از اعمال تنظیمات، مقدار دقیق را دوباره اندازه می‌گیریم
    window.setTimeout(measureAndApplySafeTop, 250);
  } catch {
    /* در صورت پشتیبانی نشدن، محاسبهٔ CSS کافی است */
  }
}
