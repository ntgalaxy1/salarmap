import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App";
import { initNativeChrome } from "./lib/nativeChrome";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// تنظیم نوار وضعیت اندروید (جلوگیری از تداخل با هدر برنامه در نسخه APK)
void initNativeChrome();

// ثبت Service Worker برای قابلیت نصب (PWA) و کار آفلاین پوسته برنامه
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* اگر فایل sw.js در دسترس نبود، برنامه بدون آن هم کار می‌کند */
    });
  });
}
