/**
 * کلاینت سبک GitHub REST API — مستقیم از مرورگر (CORS پشتیبانی می‌شود)
 * برای: تأیید حساب مدیر، خواندن فایل داده و ثبت تغییرات در یک Commit.
 */
const API = "https://api.github.com";

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** دریافت محتوای خام فایل به‌جای JSON */
  raw?: boolean;
}

async function request<T>(token: string, path: string, opts: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: opts.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new GitHubError(0, "اتصال به اینترنت یا GitHub برقرار نشد. اینترنت خود را بررسی کنید.");
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const j = (await res.json()) as { message?: string };
      if (j.message) message = j.message;
    } catch {
      /* ignore */
    }
    throw new GitHubError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return (opts.raw ? res.text() : res.json()) as Promise<T>;
}

// ─── حساب کاربری و مخزن ──────────────────────────────────────────────────

export interface Viewer {
  login: string;
  name: string | null;
  avatar_url: string;
}
export const getViewer = (token: string) => request<Viewer>(token, "/user");

export interface RepoInfo {
  full_name: string;
  default_branch: string;
  private: boolean;
  html_url: string;
  permissions?: { admin: boolean; push: boolean; pull: boolean };
}
export const getRepo = (token: string, repo: string) => request<RepoInfo>(token, `/repos/${repo}`);

/** ساخت خودکار مخزن در صورت وجود نداشتن (با توکن کلاسیک) */
export const createRepo = (token: string, name: string) =>
  request<RepoInfo>(token, "/user/repos", {
    method: "POST",
    body: {
      name,
      description: "سالار مپ — نقشه تعاملی",
      private: false,
      auto_init: true,
    },
  });

/** محتوای خام یک فایل از مخزن */
export const getRawFile = (token: string, repo: string, path: string, ref: string) =>
  request<string>(token, `/repos/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`, {
    raw: true,
  });

// ─── ثبت چند فایل در یک Commit (Git Data API) ─────────────────────────────

export interface CommitFile {
  /** مسیر داخل مخزن، مثل public/data/places.json */
  path: string;
  /** محتوا (utf-8 یا base64) */
  content: string;
  encoding: "utf-8" | "base64";
}

/** اگر مخزن کاملاً خالی باشد (بدون هیچ فایلی)، یک فایل اولیه می‌سازد تا شاخه اصلی ایجاد شود */
async function ensureBranchExists(token: string, repo: string, branch: string): Promise<void> {
  try {
    await request(token, `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  } catch (e) {
    if (e instanceof GitHubError && (e.status === 404 || e.status === 409)) {
      await request(token, `/repos/${repo}/contents/README.md`, {
        method: "PUT",
        body: {
          message: "راه‌اندازی اولیه مخزن سالار مپ",
          content: utf8ToBase64("# سالار مپ\n"),
          branch,
        },
      });
    } else {
      throw e;
    }
  }
}

export async function commitFiles(
  token: string,
  repo: string,
  branch: string,
  files: CommitFile[],
  message: string
): Promise<string> {
  await ensureBranchExists(token, repo, branch);

  const ref = await request<{ object: { sha: string } }>(
    token,
    `/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`
  );
  const headSha = ref.object.sha;
  const head = await request<{ tree: { sha: string } }>(token, `/repos/${repo}/git/commits/${headSha}`);

  const treeItems: { path: string; mode: "100644"; type: "blob"; sha: string }[] = [];
  for (const f of files) {
    const blob = await request<{ sha: string }>(token, `/repos/${repo}/git/blobs`, {
      method: "POST",
      body: { content: f.content, encoding: f.encoding },
    });
    treeItems.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  const tree = await request<{ sha: string }>(token, `/repos/${repo}/git/trees`, {
    method: "POST",
    body: { base_tree: head.tree.sha, tree: treeItems },
  });
  const commit = await request<{ sha: string }>(token, `/repos/${repo}/git/commits`, {
    method: "POST",
    body: { message, tree: tree.sha, parents: [headSha] },
  });
  await request(token, `/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    body: { sha: commit.sha, force: false },
  });
  return commit.sha;
}

// ─── ابزارها ─────────────────────────────────────────────────────────────

/** تبدیل متن UTF-8 (مثل JSON فارسی) به base64 */
export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/** «owner/repo» از ورودی‌های مختلف (آدرس کامل، با .git و…) */
export function normalizeRepo(input: string): string {
  const s = input
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/[/\s]+$/, "")
    .replace(/\.git$/i, "");
  const parts = s.split("/").filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : s;
}

/** پیام فارسی قابل‌فهم برای خطاها */
export function describeError(e: unknown): string {
  if (e instanceof GitHubError) {
    switch (e.status) {
      case 0:
        return e.message;
      case 401:
        return "کد توکن اشتباه یا منقضی شده است. لطفاً یک توکن جدید از گیت‌هاب کپی کنید.";
      case 403:
        return /rate limit/i.test(e.message)
          ? "محدودیت موقت درخواست‌های گیت‌هاب؛ چند دقیقه بعد دوباره تلاش کنید."
          : "این توکن اجازه ویرایش مخزن را ندارد. هنگام ساخت توکن، تیک «repo» یا «Contents: Read and write» را روشن کنید.";
      case 404:
        return "مخزن پیدا نشد. مطمئن شوید نام مخزن را به شکل نام‌کاربری/نام‌مخزن (مثلاً ali/tabriz-map) درست نوشته‌اید و ابتدا آن را در سایت گیت‌هاب ساخته‌اید.";
      case 409:
      case 422:
        return "تداخل هنگام ثبت تغییرات؛ لطفاً دوباره دکمه «انتشار» را بزنید.";
      default:
        return `خطای گیت‌هاب (${e.status}): ${e.message}`;
    }
  }
  if (e instanceof Error) return e.message;
  return "خطای ناشناخته";
}
