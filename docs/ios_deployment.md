# Stilo iOS Deployment & Build Guide

This comprehensive guide covers how to build Stilo for production via the Expo Cloud, and how to test the custom native app locally on an iOS Simulator.

---

## 1. Local Simulator Testing (Custom Dev Client)

Because Stilo uses custom native modules (Firebase Native, Sign In With Apple), you cannot simply use the standard "Expo Go" app to scan a QR code. You must compile a custom iOS application capable of handling native code.

### The Apple "devicectl" Bug
Currently, there is a known bug in newer versions of MacOS and Xcode 16 where the Expo CLI (`npx expo run:ios`) will aggressively demand a paid Apple Developer Code Signing Certificate if it detects your physical iPhone connected over Wi-Fi or USB. It will mistakenly try to install the app to your phone instead of the Simulator.

### How to Build & Run Locally (The Bulletproof Way)
To force the native app to compile strictly for the iOS Simulator (which bypasses all Apple Certificate requirements):

1. Unplug your physical iPhone from your Mac and temporarily turn off its Wi-Fi if you have ever debugged it wirelessly.
2. Open the **Simulator** app manually on your Mac (Search "Simulator" in Spotlight).
3. In your terminal, clear out any old cached builds and start the Expo bundler:
   ```bash
   npx expo prebuild --clean
   npx expo start --clear
   ```
4. Once the server is running and displaying the QR code in your terminal, **press the `i` key**.
5. Expo will now natively compile the `stilo.app` exactly for the running Simulator without searching for physical hardware.
6. Once the app launches on the Simulator, you can safely turn your physical iPhone's Wi-Fi back on.

### Complete Simulator Compilation Bypass
If Expo aggressively insists on a code signature because it mistakenly detected a physical iPhone on Wi-Fi, you can completely sidestep the bug using the custom wrapper script.

From your terminal, simply run:
```bash
npm run simulator:ios
```
*(This entirely automates raw `xcodebuild` compilation with code signing explicitly disabled, actively tracks down your booted Simulator, and flawlessly injects the resulting `.app` executable natively without utilizing the broken Expo CLI).*

---

## 2. Production App Store Builds (EAS Cloud)

When you are ready to publish an official update to Apple TestFlight or the App Store, you should leverage Expo's Cloud Builders. This entirely bypasses local keychain certificate headaches.

### Prerequisites (Environment Variables)
Because iOS cloud builds cannot read your local `.env` file, you must ensure your `EXPO_PUBLIC_` variables are uploaded to EAS:
[Expo Projects > Stilo > Secrets](https://expo.dev/accounts/erind.shkurti/projects/stilo)

**Ensure these Plaintext secrets exist**:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

If `GoogleService-Info.plist` is required, ensure it exists as a File Secret named `GOOGLE_SERVICES_IOS`.

### Triggering the Cloud Build
Before triggering a new production build, you **must** bump your iOS native build number so Apple doesn't organically reject the duplicate file.

For your convenience, this has been wrapped into a single NPM script. From your terminal, execute:
```bash
npm run deploy:ios
```
*(This will safely bump `build-number.json`, ask EAS to cloud-compile the Javascript, queue a Mac Builder, and digitally sign it with your Apple Developer account automatically).*

### Submitting to Apple
If you did not use the `--auto-submit` flag (or if it skipped because it wasn't interactive), you can manually push the successfully compiled app straight to App Store Connect by running:

```bash
eas submit --platform ios
```
*(This will interactively ask you to select the `.ipa` from the EAS server and push it directly to TestFlight).*

---

## 3. Automating Submissions

If you want `eas build --auto-submit` to work completely hands-free in the background without prompting you, you can hardcode your App Store credentials in your `eas.json`.

Update `eas.json` to include:
```json
"submit": {
  "production": {
    "appleId": "your-apple-email@domain.com",
    "ascAppId": "1234567890"  // Found in App Store Connect -> App Information
  }
}
```
