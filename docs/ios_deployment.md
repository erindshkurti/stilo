# Stilo iOS Build &Deployment Guide

This comprehensive guide explicitly defines the two distinct methods you must use to build Stilo natively on your machine, depending on your target: Local Simulator Testing vs App Store Deployment.

---

## 1. Local Xcode Build for Simulator (Development)

Because Stilo relies heavily on custom native modules (Firebase Native, Sign In With Apple), you simply cannot use the standard "Expo Go" app. You must always compile a fresh custom iOS tracking application to test new code during development.

### The Apple "devicectl" Bug
Currently, there is a widely known bug within newer versions of MacOS and Xcode 16 where the standard Expo CLI (`npx expo run:ios`) will aggressively demand a paid Apple Developer Code Signing Certificate if it detects your personal, physical iPhone connected over Wi-Fi or USB. It will mistakenly attempt to compile and install the app to your literal phone hardware instead of your target Simulator.

### The Solution: Universal Simulator Bypass
To completely circumvent this Expo CLI bug and force raw, unsigned compilation directly for your active Simulator hardware, a custom NPM script has been provided that permanently bypasses all Apple Certificate layers for development purposes:

From your terminal, execute:
```bash
npm run simulator:ios
```
*(This strictly automates raw `xcodebuild` compilation directly to your machine's CPU with code signing explicitly disabled, dynamically locates the active Simulator's UID, and flawlessly installs the resulting `.app` executable natively).*

Once the app opens on the Simulator, ensure your Metro server is running (`npx expo start --clear`) so it can connect and serve your live Javascript bundles!

---

## 2. EAS Local Build for App Store (Production)

When you are completely ready to finally publish a polished update to Apple TestFlight / App Store Connect, you must generate a highly secure Production `.ipa` file. 

Instead of waiting 15-30 minutes queuing in the busy Expo Cloud CI network, Stilo is configured to utilize `eas build --local`. This perfectly accesses your logged-in Developer Keychain and compiles the precise App Store binary entirely via your own Mac's CPU at peak speeds.

### Prerequisites (Environment Variables)
Because iOS offline production builds cannot securely read your local `.env` file during EAS compilation, you **must** ensure your `EXPO_PUBLIC_` variables have been explicitly uploaded to Expo's remote servers:
[Expo Projects > Stilo > Secrets](https://expo.dev/accounts/erind.shkurti/projects/stilo)

**Ensure these Plaintext secrets exist**:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

If you are ever missing the `GoogleService-Info.plist` file, you must upload its base64 string to EAS as a file secret named `GOOGLE_SERVICES_IOS`.

### Triggering the Local Production Build
Before triggering a new production build, you **must** organically bump your iOS native build number, or else Apple App Store Connect will immediately and forcefully reject your duplicate submission.

For your convenience, this entire operation has been meticulously wrapped into a solitary master script. 

From your terminal, execute:
```bash
npm run deploy:ios
```
*(This perfectly automates securely incrementing your `build-number.json`, transparently authenticating your Apple Developer Keychain profile, compiling the `.ipa` executable utilizing your local blazing-fast Mac CPU to radically bypass the Cloud queue, and finally instantly auto-submits the successful result straight to Apple TestFlight!)*

---

## 3. Automating Submissions (EAS JSON Configs)

If you strictly want the `npm run deploy:ios` pipeline (the EAS Local Build) to function completely hands-free in the deep background without arbitrarily pausing mid-build to prompt you for an Apple API password, your App Store Connect configuration credentials must remain hardcoded in your `eas.json` file.

Update `eas.json` at any time to explicitly include:
```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-email@domain.com",
      "ascAppId": "1234567890"  // Found manually in App Store Connect -> App Information
    }
  }
}
```
