#!/bin/bash
# Restore GoogleService-Info.plist from EAS secret (after install, before expo prebuild)
DEST="${EAS_BUILD_WORKINGDIR:-$PWD}/GoogleService-Info.plist"
if [ -n "$GOOGLE_SERVICES_IOS_BASE64" ]; then
  echo "$GOOGLE_SERVICES_IOS_BASE64" | base64 --decode > "$DEST"
  echo "✓ GoogleService-Info.plist written to $DEST"
else
  echo "⚠ GOOGLE_SERVICES_IOS_BASE64 not set — skipping plist restore"
fi
