#!/bin/bash
# Setzt ?v=<hash> im index.html auf den echten Datei-Hash jeder JS/CSS-Datei
cd "$(dirname "$0")"
for f in js/*.js styles/app.css; do
  h=$(md5sum "$f" | cut -c1-10)
  # ersetzt ?v=... hinter genau diesem Dateipfad
  esc=$(printf '%s' "$f" | sed 's/[\/&]/\\&/g')
  sed -i -E "s|(${esc})\?v=[a-f0-9]+|\1?v=${h}|g" index.html
done
# SW-Cache-Version = Hash über alle Assets
NEW="ktm-shell-$(cat js/*.js styles/app.css | md5sum | cut -c1-10)"
sed -i -E "s/ktm-shell-[a-f0-9]+/${NEW}/g" sw.js
echo "$NEW"
