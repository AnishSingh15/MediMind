#!/bin/bash
# Restore GoogleService-Info.plist from EAS secret before iOS build
if [ -n "$GOOGLE_SERVICES_IOS_BASE64" ]; then
  echo "$GOOGLE_SERVICES_IOS_BASE64" | base64 --decode > "$EAS_BUILD_WORKINGDIR/GoogleService-Info.plist"
  echo "✓ GoogleService-Info.plist restored from EAS secret"
else
  echo "⚠ GOOGLE_SERVICES_IOS_BASE64 not set — skipping plist restore"
fi
