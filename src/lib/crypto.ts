/**
 * رمزنگاری سمت مرورگر (WebCrypto)
 *  - رمز مدیر هرگز ذخیره نمی‌شود؛ فقط هش PBKDF2 آن (verifier) در admin.json است
 *  - توکن GitHub با کلیدی که از رمز مدیر مشتق می‌شود (AES-GCM) رمزنگاری می‌شود
 */
import type { EncryptedBlob } from "../types";

const te = new TextEncoder();
const td = new TextDecoder();

export const hasWebCrypto = () =>
  typeof crypto !== "undefined" &&
  typeof crypto.subtle !== "undefined" &&
  typeof crypto.getRandomValues === "function";

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return a;
}

export function toB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

export interface DerivedSecret {
  /** برای مقایسه با admin.json */
  verifier: string;
  /** کلید رمزنگاری توکن (هرگز ذخیره نمی‌شود) */
  key: CryptoKey;
}

/** PBKDF2-SHA256 → ۶۴ بایت: نیمه اول verifier، نیمه دوم کلید AES */
export async function deriveSecret(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<DerivedSecret> {
  const material = await crypto.subtle.importKey("raw", te.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, material, 512)
  );
  const key = await crypto.subtle.importKey("raw", bits.slice(32), "AES-GCM", false, ["encrypt", "decrypt"]);
  return { verifier: toB64(bits.slice(0, 32)), key };
}

export async function encryptText(key: CryptoKey, text: string): Promise<EncryptedBlob> {
  const iv = randomBytes(12);
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, te.encode(text)));
  return { iv: toB64(iv), data: toB64(data) };
}

export async function decryptText(key: CryptoKey, blob: EncryptedBlob): Promise<string> {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(blob.iv) }, key, fromB64(blob.data));
  return td.decode(plain);
}

/** مقایسه با زمان ثابت */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
