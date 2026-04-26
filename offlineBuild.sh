###!/bin/bash
#
#rm -rf ios
#rm -rf dist
#npx expo prebuild
#npx expo export --output-dir ios/build-assets --platform ios
#npx react-native bundle \
#  --platform ios \
#  --dev false \
#  --entry-file node_modules/expo-router/entry.js \
#  --bundle-output ios/main.jsbundle \
#  --assets-dest ios
#FILE="ios/acousticpod/AppDelegate.swift"
#
## Check that the file exists
#if [ ! -f "$FILE" ]; then
#  echo "❌ File not found: $FILE"
#  exit 1
#fi
#
## Use awk to replace the old bundleURL() function with the new one
#awk '
#BEGIN { in_block=0 }
#/override func bundleURL\(\) -> URL\?/ { in_block=1; print "    override func bundleURL() -> URL? {"; next }
#in_block && /#endif/ {
#  in_block=0
#  print "    #if DEBUG"
#  print "return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: \".expo/.virtual-metro-entry\", fallbackExtension: nil)"
#  print "    #else"
#  print "      return Bundle.main.url(forResource: \"main\", withExtension: \"jsbundle\")"
#  print "    #endif"
#  next
#}
#!in_block { print }
#' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"
#
#echo "✅ AppDelegate.swift has been updated successfully."
#
#open ios/*.xcworkspace

##!/bin/bash
#
## Clean up previous builds
#rm -rf ios
#rm -rf dist
#
## Prebuild the iOS project (this generates the ios folder)
#npx expo prebuild
#
## Open the workspace in Xcode
#open ios/*.xcworkspace
#
#echo "✅ iOS project generated. In Xcode:"
#echo "1. Select your project in the sidebar"
#echo "2. Go to 'Signing & Capabilities'"
#echo "3. Select your Personal Team (free developer account)"
#echo "4. Build and run on your device"


#!/bin/bash

rm -rf ios
rm -rf dist

npx expo prebuild

npx expo export \
  --output-dir ios/build-assets \
  --platform ios

npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios

FILE="ios/acousticpod/AppDelegate.swift"

if [ ! -f "$FILE" ]; then
  echo "❌ File not found: $FILE"
  exit 1
fi

awk '
BEGIN { in_block=0 }
/override func bundleURL\(\) -> URL\?/ { in_block=1; print "    override func bundleURL() -> URL? {"; next }
in_block && /#endif/ {
  in_block=0
  print "    #if DEBUG"
  print "      return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: \".expo/.virtual-metro-entry\", fallbackExtension: nil)"
  print "    #else"
  print "      return Bundle.main.url(forResource: \"main\", withExtension: \"jsbundle\")"
  print "    #endif"
  next
}
!in_block { print }
' "$FILE" > "$FILE.tmp" && mv "$FILE.tmp" "$FILE"

echo "✅ AppDelegate.swift has been updated successfully."

open ios/*.xcworkspace