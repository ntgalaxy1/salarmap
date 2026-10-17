# 🗺️ سالار مپ (Salar Map)

اپلیکیشن **سالار مپ** با پشتیبانی کامل از **نقشه گوگل** (خیابانی، ماهواره‌ای، ترکیبی و توپوگرافی) و OpenStreetMap — با تمرکز آغازین روی شهر تبریز.
مکان‌ها با نشانگرهای **سبز** و **بنفش** روی نقشه نمایش داده می‌شوند و با لمس هر نشانگر، پنلی با
**توضیحات، مشخصات و تصاویر** باز می‌شود.

برنامه **دو بخش** دارد:

| بخش | چه کسی | چه می‌کند |
|---|---|---|
| 👁️ **نمای کاربر** | همه | دیدن مکان‌ها، توضیحات و عکس‌ها، زوم، جستجو، فیلتر سبز/بنفش، لیست، مسیریابی. هیچ دکمه ویرایشی ندارد. |
| 🛡️ **پنل مدیریت** | فقط مدیر (ورود با **نام کاربری و رمز عبور**) | جستجو، افزودن مکان با مختصات + توضیحات + تصاویر، انتخاب رنگ نشانگر (سبز/بنفش)، ویرایش، جابه‌جایی، حذف، انتشار |

ساخته‌شده با: React 19 + Vite + Tailwind CSS 4 + Leaflet | اندروید: Capacitor | بیلد خودکار: GitHub Actions | داده‌ها: فایل JSON داخل همین مخزن

---

## 🛡️ پنل مدیریت

### ورود
منوی **⋮** بالای صفحه ← **ورود به مدیریت** (یا `#admin` در انتهای آدرس).

**حساب اولیه:** نام کاربری `admin` — رمز `admin1234`
بعد از اولین ورود، در **تنظیمات ← حساب مدیر** نام کاربری و رمز جدید انتخاب کنید (حداقل ۸ کاراکتر).
رمز هیچ‌جا ذخیره نمی‌شود؛ فقط هش آن (PBKDF2) در `public/data/admin.json` قرار می‌گیرد.

### تب‌ها
- **مکان‌ها:** جستجو (نام، توضیح، آدرس) + فیلتر رنگ + لیست با دکمه‌های ویرایش / روی نقشه / حذف + دکمه «افزودن مکان»
- **نقشه:** همه نشانگرها؛ لمس هر نشانگر ← ویرایش / جابه‌جایی / حذف؛ افزودن مکان از همان‌جا
- **تنظیمات:** حساب مدیر، اتصال به GitHub، لغو تغییرات، لینک‌های انتشار

### افزودن مکان
«افزودن مکان» ← نقشه را حرکت دهید تا نشانگر روی مکان بنشیند ← تأیید ← فرم:
نام، **رنگ نشانگر (سبز / بنفش)**، مختصات (قابل ویرایش دستی)، توضیح کوتاه، توضیح کامل، تصاویر (گالری / دوربین / لینک)، و اطلاعات اختیاری (آدرس، تلفن، ساعت کار، وب‌سایت).

### حالت محلی و انتشار
- تا وقتی به GitHub متصل نشده‌اید، تغییرات **فقط روی همین دستگاه** ذخیره می‌شوند (IndexedDB) — برای تست کافی است.
- برای انتشار برای همه کاربران: **تنظیمات ← اتصال به GitHub** ← مخزن (`owner/repo`) + توکن + رمز فعلی.
  توکن با رمز مدیر رمزنگاری (AES-GCM) و در مخزن ذخیره می‌شود؛ از آن به بعد روی هر دستگاهی فقط با نام کاربری و رمز وارد می‌شوید.
- دکمه **«انتشار»** پایین پنل، همه تغییرات (JSON + عکس‌ها) را در **یک Commit** ثبت می‌کند. نسخه وب ۲–۳ دقیقه بعد به‌روز می‌شود و اپ اندروید کاربران داده جدید را با باز شدن دریافت می‌کند (بدون نصب مجدد).
- ساخت APK جدید فقط در صورت فعال بودن گزینه «ساخت APK جدید هنگام انتشار» انجام می‌شود.

### ساخت توکن GitHub (یک‌بار)
1. <https://github.com/settings/personal-access-tokens/new>
2. **Repository access → Only select repositories →** مخزن برنامه
3. **Permissions → Repository permissions → Contents → Read and write**
4. **Generate token** → کپی → در تنظیمات پنل مدیریت بچسبانید

### ریست حساب مدیر (اگر رمز را فراموش کردید)
فایل `public/data/admin.json` را در GitHub با این محتوا جای‌گزین کنید (حساب به `admin / admin1234` برمی‌گردد):

```json
{
  "version": 1,
  "username": "admin",
  "salt": "UyaVUMQZrc5N0yZCxMZf8g==",
  "iterations": 250000,
  "verifier": "S6ImX1LUfkphhIl5OuxcYkghviAI0fvfgExgCxc3l3U=",
  "isDefault": true,
  "github": null
}
```

---

## 🔁 چرخه کار برای تغییر کد

| مرحله | چه می‌کنید | کجا |
|---|---|---|
| ۱ | فایل را ویرایش می‌کنید و **Commit changes** می‌زنید | github.com در مرورگر گوشی |
| ۲ | GitHub خودش نسخه وب و APK را می‌سازد (۵ تا ۱۰ دقیقه) | تب **Actions** |
| ۳ | APK را دانلود و نصب می‌کنید — نسخه جدید روی قبلی نصب می‌شود | بخش **Releases** |

لینک ثابت آخرین APK: `https://github.com/<owner>/<repo>/releases/latest/download/tabriz-map.apk`
نسخه وب: `https://<owner>.github.io/<repo>/`

---

## 🚀 راه‌اندازی اولیه (فقط یک‌بار، ~۱۵ دقیقه)

1. **حساب GitHub**: <https://github.com/signup>
2. پروژه را به‌صورت ZIP روی گوشی در `Download/tabriz-map` از حالت فشرده خارج کنید.
3. **Termux** ([F-Droid](https://f-droid.org/packages/com.termux/)):

   ```bash
   pkg update -y && pkg install git gh -y
   termux-setup-storage
   gh auth login        # GitHub.com → HTTPS → Login with a web browser

   cd ~/storage/downloads/tabriz-map
   git init -b main && git add . && git commit -m "شروع پروژه"
   gh repo create tabriz-map --public --source=. --remote=origin --push
   ```

   *بدون Termux:* ریپوی خالی → **Code → Codespaces** → ZIP را آپلود و `unzip` کنید → Commit & Push.

4. **Settings → Pages → Build and deployment → Source → GitHub Actions**
5. وارد مدیریت شوید (`admin / admin1234`) → رمز را عوض کنید → GitHub را متصل کنید.

---

## ✏️ چه چیزی را کجا تغییر دهم؟

| می‌خواهم… | کجا |
|---|---|
| مکان اضافه/ویرایش/حذف کنم، عکس بگذارم | **پنل مدیریت** (بدون کد) — یا `public/data/places.json` |
| نام یا رنگ نشانگرهای سبز/بنفش | `src/data/mapConfig.ts` ← `MARKER_TYPES` |
| مرکز، محدوده یا نوع نقشه پیش‌فرض | `src/data/mapConfig.ts` |
| اندازه/انیمیشن نشانگرها | `src/index.css` ← `.dot` |
| نام برنامه / رنگ تم | `index.html`، `public/manifest.webmanifest`، `capacitor.config.json` |
| آیکون برنامه | `public/icons/icon-512.png` و `icon-192.png` |
| متن‌های پنل اطلاعات | `src/components/PlaceSheet.tsx` |
| فیلدهای فرم مدیریت | `src/components/admin/PlaceEditor.tsx` + `src/types.ts` |
| شناسه اپ اندروید | `capacitor.config.json` ← `appId` |

### ساختار هر مکان در `places.json`

```json
{
  "id": "my-place",
  "name": "نام مکان",
  "kind": "green",
  "lat": 38.08,
  "lng": 46.29,
  "short": "توضیح یک‌خطی",
  "description": "توضیح کامل…",
  "address": "تبریز، …",
  "phone": "041-3xxxxxxx",
  "hours": "۹ تا ۱۸",
  "website": "https://…",
  "images": ["data/images/my.jpg", "https://…"]
}
```

`kind`: `green` (سبز) یا `purple` (بنفش). عکس‌های محلی در `public/data/images/`.

---

## 🏗️ معماری

```
کاربر ──► برنامه (وب / APK) ──► data/places.json از GitHub Pages (تازه) یا نسخه همراه برنامه (آفلاین)
مدیر  ──► نام کاربری + رمز ──► (توکن GitHub از admin.json با رمز باز می‌شود)
      ──► پیش‌نویس روی دستگاه (IndexedDB) ──► «انتشار» = یک Commit (JSON + عکس‌ها)
                                                             │
                                                             ▼
                                        GitHub Actions ──► نسخه وب (Pages) [+ APK اگر فعال باشد]
```

```
.github/workflows/build.yml      ← با هر Commit: وب (Pages) + اندروید (APK/AAB امضاشده)
public/data/places.json          ← ★ داده مکان‌ها (پنل مدیریت همین را می‌نویسد)
public/data/admin.json           ← حساب مدیر (هش رمز + توکن رمزنگاری‌شده)
public/data/images/              ← عکس‌های محلی
src/lib/crypto.ts                ← PBKDF2 / AES-GCM (WebCrypto)
src/lib/adminConfig.ts           ← بارگذاری/تأیید/ذخیره حساب مدیر
src/lib/github.ts                ← کلاینت GitHub API (Commit)
src/lib/placesStore.ts           ← بارگذاری/اعتبارسنجی/انتشار داده
src/hooks/useAdmin.ts            ← ورود، تغییر رمز، اتصال GitHub
src/hooks/usePlaces.ts           ← داده + پیش‌نویس
src/components/admin/            ← ورود، پنل مدیریت (مکان‌ها/نقشه/تنظیمات)، فرم مکان، انتخاب موقعیت
src/components/                  ← نقشه، پنل اطلاعات، گالری، هدر، لیست، راهنما
```

> **نکته امنیتی:** فایل `admin.json` عمومی است، بنابراین رمز مدیر باید قوی باشد (ترکیب حروف و عدد، حداقل ۸ کاراکتر). ورود مدیر به WebCrypto نیاز دارد که فقط روی **https** یا **localhost** فعال است.

---

## 🧪 تست فوری (اختیاری)

```bash
pkg install nodejs-lts -y        # در Termux
npm install
npm run dev -- --host            # سپس http://localhost:5173 در Chrome
npm run build                    # خروجی وب در پوشه dist
```

## 📦 انتشار در استورها
- **بازار / مایکت:** `tabriz-map.apk` — **گوگل‌پلی:** `tabriz-map.aab` (از Releases)
- کلید امضا در اولین بیلد ساخته و در `signing/` ذخیره می‌شود؛ می‌توانید کلید خودتان را در `Settings → Secrets → Actions` با نام‌های `KEYSTORE_BASE64`، `KEYSTORE_PASSWORD`، `KEY_ALIAS` بگذارید.

## 🗺️ درباره نقشه گوگل
کاشی‌های گوگل مستقیم نمایش داده می‌شوند و **به کلید API نیاز نیست**. برای استفاده تجاری در مقیاس بزرگ از [Google Maps Platform](https://developers.google.com/maps) کلید بگیرید. جایگزین‌های ایرانی رایگان: [نشان](https://platform.neshan.org) و [Map.ir](https://map.ir) — آدرس کاشی‌ها در `src/data/mapConfig.ts`.

## 🛠️ مشکلات رایج

| مشکل | راه‌حل |
|---|---|
| رمز مدیر را فراموش کرده‌ام | `public/data/admin.json` را با نسخه اولیه (بالا) جای‌گزین کنید |
| «برای ورود مدیر، برنامه باید از طریق https یا localhost باز شود» | آدرس را با https یا `localhost` باز کنید (نه IP شبکه) |
| اتصال GitHub خطا می‌دهد | نام مخزن `owner/repo`؛ توکن با مجوز Contents: Read and write برای همان مخزن |
| انتشار شد ولی کاربران نمی‌بینند | ۲–۳ دقیقه صبر؛ Settings → Pages روی GitHub Actions؛ تیک سبز در Actions |
| بیلد قرمز شد | در Actions روی اجرای ناموفق بزنید؛ خطا نام فایل و شماره خط را می‌گوید |
| «برنامه نصب نشد» | نسخه قبلی با کلید دیگری امضا شده؛ یک‌بار حذف و دوباره نصب کنید |
| npm در Termux خطا می‌دهد | `npm config set registry https://registry.npmmirror.com` |
| `git push` رد شد | اول `git pull --rebase` (بیلد خودکار و پنل مدیریت هم به ریپو Commit می‌کنند) |
