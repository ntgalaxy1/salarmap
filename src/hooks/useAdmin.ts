import { useCallback, useState } from "react";
import type { AdminConfig, AdminSession, GitHubLink } from "../types";
import {
  DEFAULT_CREDENTIALS,
  MIN_PASSWORD,
  MIN_USERNAME,
  buildConfig,
  clearConfigOverride,
  commitAdminConfig,
  loadAdminConfig,
  saveAdminConfig,
  saveConfigOverride,
  unlockToken,
  validateGitHub,
  verifyPassword,
  withGitHub,
  type ConfigSource,
} from "../lib/adminConfig";
import { KEYS, readJSON, removeKey, writeJSON } from "../lib/storage";

const GH_LOCAL_KEY = "tm.admin.github";

function loadSavedGitHub(): (GitHubLink & { token: string }) | null {
  return readJSON<(GitHubLink & { token: string }) | null>(GH_LOCAL_KEY, null, localStorage);
}

function loadSession(): AdminSession | null {
  const s =
    readJSON<AdminSession | null>(KEYS.session, null, localStorage) ??
    readJSON<AdminSession | null>(KEYS.session, null, sessionStorage);
  if (!s) return null;
  if (!s.github) {
    const savedGh = loadSavedGitHub();
    if (savedGh) return { ...s, github: savedGh };
  }
  return s;
}

/** ورود مدیر با نام کاربری و رمز عبور + مدیریت حساب و اتصال GitHub */
export function useAdmin() {
  const [session, setSession] = useState<AdminSession | null>(loadSession);
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [configSource, setConfigSource] = useState<ConfigSource | null>(null);
  const [configLoading, setConfigLoading] = useState(false);

  const persistSession = useCallback((s: AdminSession | null) => {
    removeKey(KEYS.session);
    if (s) writeJSON(KEYS.session, s, s.remember ? localStorage : sessionStorage);
    setSession(s);
  }, []);

  const loadConfig = useCallback(async (): Promise<AdminConfig> => {
    setConfigLoading(true);
    try {
      const { config, source } = await loadAdminConfig();
      setConfig(config);
      setConfigSource(source);
      return config;
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const login = useCallback(
    async (username: string, password: string, remember: boolean): Promise<AdminSession> => {
      const cfg = await loadConfig();
      const key = await verifyPassword(cfg, username, password);
      if (!key) throw new Error("نام کاربری یا رمز عبور اشتباه است");
      let github: AdminSession["github"] = loadSavedGitHub();
      if (!github && cfg.github) {
        const token = await unlockToken(cfg, key);
        if (token) {
          github = { repo: cfg.github.repo, branch: cfg.github.branch, token };
          writeJSON(GH_LOCAL_KEY, github, localStorage);
        }
      }
      const s: AdminSession = { username: cfg.username, isDefault: cfg.isDefault, remember, github };
      persistSession(s);
      return s;
    },
    [loadConfig, persistSession]
  );

  const logout = useCallback(() => persistSession(null), [persistSession]);

  /** تغییر نام کاربری و رمز عبور */
  const changeCredentials = useCallback(
    async (currentPassword: string, newUsername: string, newPassword: string) => {
      if (!session) throw new Error("ابتدا وارد شوید");
      const cfg = config ?? (await loadConfig());
      const key = await verifyPassword(cfg, session.username, currentPassword);
      if (!key) throw new Error("رمز عبور فعلی اشتباه است");
      const u = newUsername.trim();
      if (u.length < MIN_USERNAME) throw new Error(`نام کاربری باید حداقل ${MIN_USERNAME} حرف باشد`);
      if (/\s/.test(u)) throw new Error("نام کاربری نباید فاصله داشته باشد");
      if (newPassword.length < MIN_PASSWORD) throw new Error(`رمز عبور باید حداقل ${MIN_PASSWORD} کاراکتر باشد`);
      if (u.toLowerCase() === DEFAULT_CREDENTIALS.username && newPassword === DEFAULT_CREDENTIALS.password) {
        throw new Error("نمی‌توانید از حساب پیش‌فرض استفاده کنید؛ رمز دیگری انتخاب کنید");
      }
      const next = await buildConfig(u, newPassword, session.github);

      // ۱) ذخیرهٔ دائمی روی حافظهٔ دستگاه + سرور ابری آنلاین (تا هرگز ریست نشود)
      saveAdminConfig(next);
      setConfigSource("device");

      // ۲) اگر به گیت‌هاب متصل است، در مخزن هم ذخیره شود
      if (session.github) {
        try {
          await commitAdminConfig(
            session.github.token,
            session.github.repo,
            session.github.branch,
            next,
            "admin: تغییر حساب مدیر [skip android]"
          );
          setConfigSource("remote");
        } catch {
          /* ذخیرهٔ محلی و ابری انجام شده و کافی است */
        }
      }

      setConfig(next);
      persistSession({ ...session, username: next.username, isDefault: false });
    },
    [session, config, loadConfig, persistSession]
  );

  /** اتصال به GitHub برای انتشار (فقط با توکن و نام مخزن — بدون نیاز به رمز عبور) */
  const connectGitHub = useCallback(
    async (repoInput: string, tokenInput: string, currentPassword?: string): Promise<GitHubLink> => {
      if (!session) throw new Error("ابتدا وارد شوید");
      const token = tokenInput.trim();
      const link = await validateGitHub(token, repoInput);
      const ghObj = { repo: link.repo, branch: link.branch, token };

      // ذخیره روی دستگاه تا همیشه بدون دردسر متصل بماند
      writeJSON(GH_LOCAL_KEY, ghObj, localStorage);
      persistSession({ ...session, github: ghObj });

      // اگر رمز عبور هم داده شده باشد، توکن را به‌صورت رمزنگاری‌شده در مخزن هم ذخیره می‌کنیم
      if (currentPassword) {
        try {
          const cfg = config ?? (await loadConfig());
          const key = await verifyPassword(cfg, session.username, currentPassword);
          if (key && typeof key !== "boolean") {
            const next = await withGitHub(cfg, key, link, token);
            await commitAdminConfig(token, link.repo, link.branch, next, "admin: اتصال پنل مدیریت به GitHub [skip android]");
            clearConfigOverride();
            setConfig(next);
            setConfigSource("remote");
          }
        } catch {
          /* ذخیره محلی انجام شده و کافی است */
        }
      }
      return link;
    },
    [session, config, loadConfig, persistSession]
  );

  const disconnectGitHub = useCallback(async () => {
    removeKey(GH_LOCAL_KEY);
    if (!session?.github) return;
    try {
      const cfg = config ?? (await loadConfig());
      const next: AdminConfig = { ...cfg, github: null, updatedAt: new Date().toISOString() };
      saveConfigOverride(next);
      setConfig(next);
      setConfigSource("device");
    } catch {
      /* ignore */
    }
    persistSession({ ...session, github: null });
  }, [session, config, loadConfig, persistSession]);

  return {
    session,
    isAdmin: session !== null,
    config,
    configSource,
    configLoading,
    loadConfig,
    login,
    logout,
    changeCredentials,
    connectGitHub,
    disconnectGitHub,
  };
}

export type AdminApi = ReturnType<typeof useAdmin>;
