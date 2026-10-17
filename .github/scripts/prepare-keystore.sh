#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  آماده‌سازی «کلید امضا»ی فایل APK
#
#  چرا مهم است؟ اندروید فقط وقتی اجازه می‌دهد نسخه جدید روی نسخه قبلی نصب
#  شود که هر دو با یک کلید امضا شده باشند. پس کلید باید بین بیلدها ثابت بماند.
#
#  اولویت انتخاب کلید:
#   ۱) Secret به نام KEYSTORE_BASE64 (+ KEYSTORE_PASSWORD و KEY_ALIAS) — برای انتشار در استور
#   ۲) فایل signing/release.keystore که در ریپو ذخیره شده
#   ۳) اگر هیچ‌کدام نبود: در اولین اجرا یک کلید جدید ساخته و در ریپو ذخیره می‌شود
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

mkdir -p signing
PASS="${KEYSTORE_PASSWORD:-tabriz-map-2024}"
ALIAS="${KEY_ALIAS:-tabrizmap}"
KS="signing/release.keystore"

if [ -n "${KEYSTORE_BASE64:-}" ]; then
  printf '%s' "$KEYSTORE_BASE64" | base64 -d > /tmp/release.keystore
  KS="/tmp/release.keystore"
  echo "✔ Using keystore from repository secrets"
elif [ -f "$KS" ]; then
  echo "✔ Using keystore stored in repository ($KS)"
else
  echo "… No keystore found — generating a new one (first build only)"
  keytool -genkeypair -v \
    -keystore "$KS" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" \
    -dname "CN=Tabriz Map, OU=Mobile, O=TabrizMap, L=Tabriz, C=IR" >/dev/null 2>&1

  # ذخیره کلید در ریپو تا بیلدهای بعدی با همین کلید امضا شوند
  git config user.name "github-actions[bot]"
  git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
  git add "$KS"
  git commit -m "chore: add Android signing keystore [skip ci]" >/dev/null
  if git push origin "HEAD:${GITHUB_REF_NAME}"; then
    echo "✔ Keystore saved to repository (signing/release.keystore)"
  else
    echo "::warning::Could not push keystore to the repository. Future builds will use a NEW key, so updates must be installed after uninstalling the old app."
  fi
fi

{
  echo "KEYSTORE_FILE=$(realpath "$KS")"
  echo "KEYSTORE_PASSWORD=$PASS"
  echo "KEY_ALIAS=$ALIAS"
} >> "$GITHUB_ENV"
