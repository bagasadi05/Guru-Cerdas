import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.portalguru.app',
    appName: 'Portal Guru',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        hostname: 'portalguru.app',
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 2000,
            launchAutoHide: true,
            backgroundColor: '#0f172a',
            spinnerColor: '#6366f1',
            showSpinner: true,
            androidSpinnerStyle: 'large',
            splashFullScreen: true,
            splashImmersive: true,
        },
        StatusBar: {
            style: 'dark',
            backgroundColor: '#0f172a',
        },
        LocalNotifications: {
            smallIcon: 'ic_stat_notification',
            iconColor: '#6366f1',
            sound: 'default',
        },
    },
    android: {
        backgroundColor: '#0f172a',
        allowMixedContent: true,
        captureInput: true,
        webContentsDebuggingEnabled: false, // Disable for production
    },
};

export default config;

