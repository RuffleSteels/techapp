#!/bin/bash

rm -rf ios
rm -rf dist
npx expo prebuild
npx expo export --output-dir ios/build-assets --platform ios
npx react-native bundle \                                   
  --platform ios \
  --dev false \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios

FILE="ios/techappnewdev/AppDelegate.swift"

# Check that the file exists
if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

# Use awk to replace the old bundleURL() function with the new one
awk '
BEGIN { in_block=0 }
/override func bundleURL\(\) -> URL\?/ { in_block=1; print "    override func bundleURL() -> URL? {"; next }
in_block && /#endif/ {
  in_block=0
  print "    #if DEBUG"
  print "return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: \".expo/.virtual-metro-entry\", fallbackExtension: nil)"
  print "    #else"
  print "      return Bundle.main.url(forResource: \"main\", withExtension: \"jsbundle\")"
  print "    #endif"
  print "    }"
  next
}
!in_block { print }
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

echo "✅ AppDelegate.swift has been updated successfully."

open ios/*.xcworkspace
