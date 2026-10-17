#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  نوشتن اطلاعات بیلد (شماره نسخه، تاریخ، لینک‌ها) در src/buildInfo.ts
#  این اسکریپت در GitHub Actions قبل از «npm run build» اجرا می‌شود تا
#  داخل برنامه شماره نسخه و لینک دانلود آخرین APK نمایش داده شود.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

NUMBER="${GITHUB_RUN_NUMBER:-dev}"
SHA="${GITHUB_SHA:-}"
SHA="${SHA:0:7}"
DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
REPO="${GITHUB_REPOSITORY:-}"
OWNER="${GITHUB_REPOSITORY_OWNER:-}"
NAME="${REPO#*/}"

PAGES_URL=""
RELEASES_URL=""
if [ -n "$REPO" ]; then
  OWNER_LC="$(printf '%s' "$OWNER" | tr '[:upper:]' '[:lower:]')"
  NAME_LC="$(printf '%s' "$NAME" | tr '[:upper:]' '[:lower:]')"
  if [ "$NAME_LC" = "${OWNER_LC}.github.io" ]; then
    PAGES_URL="https://${OWNER_LC}.github.io/"
  else
    PAGES_URL="https://${OWNER_LC}.github.io/${NAME}/"
  fi
  RELEASES_URL="https://github.com/${REPO}/releases/latest"
fi

cat > src/buildInfo.ts <<EOF
// ⚠️ این فایل به‌صورت خودکار در GitHub Actions بازنویسی می‌شود — نیازی به ویرایش دستی نیست
export const BUILD_INFO = {
  number: "${NUMBER}",
  sha: "${SHA}",
  date: "${DATE}",
  repo: "${REPO}",
  pagesUrl: "${PAGES_URL}",
  releasesUrl: "${RELEASES_URL}",
};
EOF

echo "✔ Build info: #${NUMBER} ${SHA} ${DATE} ${REPO}"
