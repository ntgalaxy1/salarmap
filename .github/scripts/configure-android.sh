#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  تنظیم پروژه اندروید (بعد از «npx cap add android»)
#   ۱) شماره نسخه = شماره بیلد (تا نسخه جدید روی قبلی نصب شود)
#   ۲) آیکون و صفحه شروع (Splash) از روی public/icons/icon-512.png
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

APP="android/app"
GRADLE="$APP/build.gradle"
RES="$APP/src/main/res"
RUN="${GITHUB_RUN_NUMBER:-1}"
ICON="public/icons/icon-512.png"
BG="#0f172a"

# ── ۱) شماره نسخه ─────────────────────────────────────────────────
sed -i -E "s/versionCode [0-9]+/versionCode ${RUN}/" "$GRADLE"
sed -i -E "s/versionName \"[^\"]*\"/versionName \"1.0.${RUN}\"/" "$GRADLE"
echo "✔ versionCode=${RUN}  versionName=1.0.${RUN}"

# ── ۲) آیکون و اسپلش ───────────────────────────────────────────────
if [ -f "$ICON" ] && command -v convert >/dev/null 2>&1; then
  TMP="$(mktemp -d)"
  # نسخه مربعی تمام‌رنگ و نسخه با گوشه‌های گرد
  convert "$ICON" -resize 512x512! "$TMP/square.png"
  convert -size 512x512 xc:none -draw "roundrectangle 0,0,511,511,100,100" "$TMP/rmask.png"
  convert "$TMP/square.png" "$TMP/rmask.png" -alpha off -compose CopyOpacity -composite "$TMP/rounded.png"
  convert -size 512x512 xc:none -draw "circle 256,256 256,0" "$TMP/cmask.png"
  convert "$TMP/square.png" "$TMP/cmask.png" -alpha off -compose CopyOpacity -composite "$TMP/round.png"

  declare -A SIZES=([mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192)
  for d in "${!SIZES[@]}"; do
    s=${SIZES[$d]}
    fg=$((s * 108 / 48))          # اندازه آیکون تطبیقی (108dp)
    inner=$((fg * 80 / 100))      # آیکون داخل ناحیه امن
    dir="$RES/mipmap-$d"
    mkdir -p "$dir"
    convert "$TMP/rounded.png" -resize "${s}x${s}" "$dir/ic_launcher.png"
    convert "$TMP/round.png" -resize "${s}x${s}" "$dir/ic_launcher_round.png"
    convert -size "${fg}x${fg}" xc:"$BG" \( "$TMP/square.png" -resize "${inner}x${inner}" \) \
      -gravity center -composite "$dir/ic_launcher_foreground.png"
  done
  if [ -f "$RES/values/ic_launcher_background.xml" ]; then
    sed -i -E "s/#[0-9A-Fa-f]{6,8}/${BG}/" "$RES/values/ic_launcher_background.xml"
  fi

  # صفحه شروع: پس‌زمینه سرمه‌ای + آیکون در وسط
  find "$RES" -name "splash.png" | while read -r f; do
    dim="$(identify -format '%w %h' "$f")"
    w="${dim% *}"; h="${dim#* }"
    m=$(( (w < h ? w : h) * 30 / 100 ))
    convert -size "${w}x${h}" xc:"$BG" \( "$TMP/rounded.png" -resize "${m}x${m}" \) \
      -gravity center -composite "$f"
  done
  rm -rf "$TMP"
  echo "✔ App icon & splash generated from $ICON"
else
  echo "::notice::Icon not generated (missing $ICON or ImageMagick) — default Capacitor icon will be used"
fi
