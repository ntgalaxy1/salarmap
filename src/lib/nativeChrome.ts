/**
 * تنظیم نوار وضعیت (Status Bar) اندروید در نسخه APK
 *
 * مشکل: در اپ اندروید، نوار وضعیت سیستم روی محتوای برنامه می‌آمد و
 * عنوان، دکمه‌ها و کادرها با هم تداخل داشتند.
 * راه‌حل: رنگ نوار وضعیت را هماهنگ می‌کنیم و می‌گوییم محتوا زیر نوار وضعیت نکشد
 * (overlay: false) تا فضای امن (safe-area) درست رعایت شود.
 */
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function initNativeChrome(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // محتوا از زیر نوار وضعیت سیستم عبور نکند (جلوگیری از تداخل با هدر برنامه)
    await StatusBar.setOverlaysWebView({ overlay: false });
    // رنگ نوار وضعیت همان رنگ هدر برنامه تا یکپارچگی بصری داشته باشد
    await StatusBar.setBackgroundColor({ color: "#0f172a" });
    await StatusBar.setStyle({ style: Style.Dark });
  } catch {
    /* در صورت پشتیبانی نشدن، برنامه بدون تغییر کار می‌کند */
  }
}
