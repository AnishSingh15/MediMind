const { writeFileSync } = require('fs');
const { resolve } = require('path');

// On EAS Build, restore GoogleService-Info.plist from the injected secret
// before Expo validates the googleServicesFile path.
if (process.env.GOOGLE_SERVICES_IOS_BASE64) {
  const dest = resolve(__dirname, 'GoogleService-Info.plist');
  const content = Buffer.from(process.env.GOOGLE_SERVICES_IOS_BASE64, 'base64').toString('utf8');
  writeFileSync(dest, content);
  console.log('✓ GoogleService-Info.plist written from GOOGLE_SERVICES_IOS_BASE64');
}

module.exports = {
  expo: {
    name: 'DoseTrack',
    slug: 'medimind',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'dosetrack',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#7C3AED',
    },
    ios: {
      bundleIdentifier: 'com.ani.medimind',
      supportsTablet: true,
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        NSCameraUsageDescription: 'Used for profile photos',
        NSPhotoLibraryUsageDescription: 'Used for profile photos',
        ITSAppUsesNonExemptEncryption: false,
      },
      entitlements: {
        'com.apple.developer.applesignin': ['Default'],
      },
    },
    android: {
      package: 'com.ani.medimind',
      adaptiveIcon: {
        backgroundColor: '#7C3AED',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: [
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'WAKE_LOCK',
        'SCHEDULE_EXACT_ALARM',
      ],
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          color: '#7C3AED',
          defaultChannel: 'medicine-reminders',
          sounds: ['./assets/sounds/pill_reminder.wav'],
        },
      ],
      '@react-native-community/datetimepicker',
      '@react-native-google-signin/google-signin',
      'expo-apple-authentication',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        projectId: 'd33c519f-74b1-4e68-ab2b-595d2349ee04',
      },
      router: {},
    },
  },
};
