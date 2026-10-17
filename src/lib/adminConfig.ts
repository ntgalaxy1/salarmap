/**
 * حساب مدیر (نام کاربری + رمز عبور)
 *  - تنظیمات در public/data/admin.json و حافظه دستگاه نگهداری می‌شود
 *  - ورود و تغییر رمز هم با WebCrypto و هم در محیط‌های آفلاین/محلی کار می‌کند
 */
import type { AdminConfig, GitHubLink } from "../types";
import {
  decryptText,
  deriveSecret,
  encryptText,
  fromB64,
  hasWebCrypto,
  randomBytes,
  safeEqual,
  toB64,
} from "./crypto";
import { commitFiles, getRepo, getViewer, normalizeRepo, utf8ToBase64 } from "./github";
import { KEYS, readJSON, removeKey, writeJSON } from "./storage";
import { bust, localBase, remoteBase } from "./urls";

export const ADMIN_PATH = "data/admin.json";
export const REPO_ADMIN_PATH = "public/data/admin.json";
export const PBKDF2_ITERATIONS = 250000;
export const MIN_PASSWORD = 4;
export const MIN_USERNAME = 3;

/** حساب پیش‌فرض اولیه */
export const DEFAULT_CREDENTIALS = { username: "admin", password: "admin1234" };

/** نسخه داخلی — دقیقاً همان محتوای فایل public/data/admin.json اولیه */
const BUILTIN: AdminConfig = {
  version: 1,
  username: "admin",
  salt: "UyaVUMQZrc5N0yZCxMZf8g==",
  iterations: 250000,
  verifier: "S6ImX1LUfkphhIl5OuxcYkghviAI0fvfgExgCxc3l3U=",
  isDefault: true,
  github: null,
};

/** هش سبک جایگزین برای محیط‌هایی که WebCrypto ندارند (مثل باز کردن فایل محلی روی گوشی) */
function simpleFallbackVerifier(password: string, saltB64: string): string {
  const str = `${saltB64}:${password}:tabriz-map-v1`;
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return `fb:${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
}

export type ConfigSource = "device" | "remote" | "local" | "builtin";

export function isValidConfig(c: unknown): c is AdminConfig {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  return (
    typeof o.username === "string" &&
    typeof o.salt === "string" &&
    typeof o.verifier === "string" &&
    typeof o.iterations === "number" &&
    (o.github === null ||
      (typeof o.github === "object" &&
        o.github !== null &&
        typeof (o.github as GitHubLink).repo === "string"))
  );
}

async function fetchConfig(base: string, timeoutMs = 4000): Promise<AdminConfig | null> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(bust(base, ADMIN_PATH), { cache: "no-store", signal: ctl.signal });
    if (!res.ok) return null;
    const j: unknown = await res.json();
    return isValidConfig(j) ? j : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** زمان آخرین تغییر تنظیمات (برای انتخاب نسخه تازه‌تر) */
function configTime(c: AdminConfig | null | undefined): number {
  if (!c?.updatedAt) return 0;
  const t = Date.parse(c.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

/**
 * انتخاب نسخه درست از حساب مدیر:
 *  - تغییرات ذخیره‌شده روی همین دستگاه (override) همیشه حفظ می‌شود و تا نسخه تازه‌تر روی سرور نیامده، اولویت دارد.
 *  - اگر روی دستگاه دیگری رمز تازه‌تری تنظیم شده باشد (updatedAt جدیدتر)، همان اعمال می‌شود.
 *  - نسخه همراه برنامه (admin.json داخل APK) فقط آخرین گزینه است تا رمز قدیمی برنگردد.
 */
export async function loadAdminConfig(): Promise<{ config: AdminConfig; source: ConfigSource }> {
  const override = readJSON<AdminConfig | null>(KEYS.adminConfig, null);
  const overrideValid = override !== null && isValidConfig(override);

  const remote = remoteBase();
  const local = localBase();
  const [r, l] = await Promise.all([
    remote && remote !== local ? fetchConfig(remote) : Promise.resolve(null),
    fetchConfig(local),
  ]);

  const remoteIsFreshCustom = r && !r.isDefault && configTime(r) > configTime(override);

  if (!remoteIsFreshCustom && overrideValid) {
    return { config: override, source: "device" };
  }
  if (r) return { config: r, source: "remote" };
  if (overrideValid) return { config: override, source: "device" };
  if (l) return { config: l, source: "local" };
  return { config: BUILTIN, source: "builtin" };
}

/** بررسی نام کاربری و رمز؛ در صورت درستی، کلید رمزنگاری (یا true) برمی‌گردد */
export async function verifyPassword(
  config: AdminConfig,
  username: string,
  password: string
): Promise<CryptoKey | boolean | null> {
  if (username.trim().toLowerCase() !== config.username.trim().toLowerCase()) return null;

  // اگر هنوز رمز پیش‌فرض است، مستقیم هم بررسی می‌کنیم تا در هر محیطی فوری باز شود
  if (config.isDefault && password === DEFAULT_CREDENTIALS.password) {
    if (hasWebCrypto()) {
      try {
        const { key } = await deriveSecret(password, fromB64(config.salt), config.iterations);
        return key;
      } catch {
        return true;
      }
    }
    return true;
  }

  // رمزهایی که روی دستگاه‌های بدون WebCrypto ساخته شده‌اند
  if (config.verifier.startsWith("fb:")) {
    return safeEqual(simpleFallbackVerifier(password, config.salt), config.verifier) ? true : null;
  }

  // برخی WebViewهای قدیمی اندروید WebCrypto ندارند؛ در این حالت از هش پشتیبان استفاده می‌شود
  if (!hasWebCrypto()) {
    if (config.fbVerifier) {
      return safeEqual(simpleFallbackVerifier(password, config.salt), config.fbVerifier) ? true : null;
    }
    throw new Error(
      "این نسخه از برنامه با تنظیمات رمز فعلی سازگار نیست. لطفاً نسخه جدید برنامه را نصب کنید."
    );
  }

  const { verifier, key } = await deriveSecret(password, fromB64(config.salt), config.iterations);
  return safeEqual(verifier, config.verifier) ? key : null;
}

/** ساخت تنظیمات جدید با نام کاربری/رمز جدید */
export async function buildConfig(
  username: string,
  password: string,
  github: (GitHubLink & { token: string }) | null
): Promise<AdminConfig> {
  if (!hasWebCrypto()) {
    const salt = btoa(String(Date.now()));
    return {
      version: 1,
      username: username.trim(),
      salt,
      iterations: 1,
      verifier: simpleFallbackVerifier(password, salt),
      isDefault: false,
      updatedAt: new Date().toISOString(),
      github: null,
    };
  }
  const salt = randomBytes(16);
  const { verifier, key } = await deriveSecret(password, salt, PBKDF2_ITERATIONS);
  return {
    version: 1,
    username: username.trim(),
    salt: toB64(salt),
    iterations: PBKDF2_ITERATIONS,
    verifier,
    fbVerifier: simpleFallbackVerifier(password, toB64(salt)),
    isDefault: false,
    updatedAt: new Date().toISOString(),
    github: github
      ? { repo: github.repo, branch: github.branch, token: await encryptText(key, github.token) }
      : null,
  };
}

/** افزودن اتصال GitHub به تنظیمات موجود */
export async function withGitHub(
  config: AdminConfig,
  key: CryptoKey,
  link: GitHubLink,
  token: string
): Promise<AdminConfig> {
  return {
    ...config,
    isDefault: false,
    updatedAt: new Date().toISOString(),
    github: { repo: link.repo, branch: link.branch, token: await encryptText(key, token) },
  };
}

export async function unlockToken(config: AdminConfig, key: CryptoKey | boolean): Promise<string | null> {
  if (!config.github || typeof key === "boolean") return null;
  try {
    return await decryptText(key, config.github.token);
  } catch {
    return null;
  }
}

export const saveConfigOverride = (c: AdminConfig) => writeJSON(KEYS.adminConfig, c);
export const clearConfigOverride = () => removeKey(KEYS.adminConfig);

/** ثبت فایل تنظیمات مدیر در مخزن */
export function commitAdminConfig(
  token: string,
  repo: string,
  branch: string,
  config: AdminConfig,
  message: string
): Promise<string> {
  return commitFiles(
    token,
    repo,
    branch,
    [{ path: REPO_ADMIN_PATH, content: utf8ToBase64(JSON.stringify(config, null, 2) + "\n"), encoding: "base64" }],
    message
  );
}

/** بررسی توکن و مخزن برای اتصال (با قابلیت تشخیص خودکار نام کاربری و ساخت خودکار مخزن) */
export async function validateGitHub(token: string, repoInput: string): Promise<GitHubLink & { login: string }> {
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error("لطفاً کد توکن گیت‌هاب را وارد کنید");
  const user = await getViewer(cleanToken);

  let cleaned = normalizeRepo(repoInput || "ntgalaxy1/salarmap");
  if (!cleaned.includes("/")) {
    cleaned = `${user.login}/${cleaned || "salarmap"}`;
  }
  if (!/^[\w.-]+\/[\w.-]+$/.test(cleaned)) {
    throw new Error("نام مخزن معتبر نیست. فقط نام مخزن (مثلاً salar-map) یا نام‌کاربری/نام‌مخزن را بنویسید.");
  }

  let info;
  try {
    info = await getRepo(cleanToken, cleaned);
  } catch (e) {
    const repoNameOnly = cleaned.split("/")[1];
    if (cleaned.toLowerCase().startsWith(user.login.toLowerCase() + "/") && repoNameOnly) {
      const { createRepo } = await import("./github");
      info = await createRepo(cleanToken, repoNameOnly);
    } else {
      throw e;
    }
  }

  if (info.permissions && !info.permissions.push) {
    throw new Error(`حساب «${user.login}» اجازه ویرایش مخزن ${cleaned} را ندارد`);
  }
  return { repo: info.full_name || cleaned, branch: info.default_branch || "main", login: user.login };
}
