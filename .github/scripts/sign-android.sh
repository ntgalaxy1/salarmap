#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  امضای خروجی‌های اندروید سالار مپ
#   • salar-map.apk  ← نصب مستقیم روی گوشی / انتشار در بازار و مایکت
#   • salar-map.aab  ← انتشار در گوگل‌پلی
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

: "${KEYSTORE_FILE:?KEYSTORE_FILE not set}"
: "${KEYSTORE_PASSWORD:?KEYSTORE_PASSWORD not set}"
: "${KEY_ALIAS:?KEY_ALIAS not set}"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
BT_VER="$(ls "$SDK/build-tools" | sort -V | tail -1)"
BT="$SDK/build-tools/$BT_VER"
OUT="output"
mkdir -p "$OUT"

# ── APK ──
UNSIGNED="$(ls android/app/build/outputs/apk/release/*.apk | head -1)"
"$BT/zipalign" -f -p 4 "$UNSIGNED" "/tmp/aligned.apk"
"$BT/apksigner" sign \
  --ks "$KEYSTORE_FILE" --ks-pass "pass:$KEYSTORE_PASSWORD" \
  --key-pass "pass:$KEYSTORE_PASSWORD" --ks-key-alias "$KEY_ALIAS" \
  --out "$OUT/salar-map.apk" "/tmp/aligned.apk"
"$BT/apksigner" verify "$OUT/salar-map.apk"
echo "✔ APK signed → $OUT/salar-map.apk"

# ── AAB (برای گوگل‌پلی) ──
AAB="$(ls android/app/build/outputs/bundle/release/*.aab 2>/dev/null | head -1 || true)"
if [ -n "$AAB" ]; then
  jarsigner -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -keypass "$KEYSTORE_PASSWORD" \
    -sigalg SHA256withRSA -digestalg SHA-256 \
    -signedjar "$OUT/salar-map.aab" "$AAB" "$KEY_ALIAS" >/dev/null
  echo "✔ AAB signed → $OUT/salar-map.aab"
fi

ls -la "$OUT"
