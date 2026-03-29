import fs from 'fs';

let buildNumber = 1;
try {
    const data = JSON.parse(fs.readFileSync('./build-number.json', 'utf8'));
    buildNumber = data.buildNumber;
} catch (e) {
    console.warn("Could not read build-number.json, defaulting to 1");
}

export default {
  "expo": {
    "name": "stilo",
    "slug": "stilo",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "stilo",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.erindshkurti.stilo",
      "usesAppleSignIn": true,
      "buildNumber": buildNumber.toString(),
      "googleServicesFile": process.env.GOOGLE_SERVICES_IOS || "./GoogleService-Info.plist",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "package": "com.erindshkurti.stilo",
      "versionCode": buildNumber,
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID ? [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID
        }
      ] : null,
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ],
      "expo-secure-store",
      "expo-apple-authentication"
    ].filter(Boolean),
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": false
    },
    "extra": {
      "eas": {
        "projectId": "994c4774-33b6-4268-989a-64c6e8c454ba"
      }
    }
  }
}
