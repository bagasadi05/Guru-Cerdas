/**
 * Capacitor Mobile Initialization
 * 
 * This module initializes Capacitor plugins for mobile app functionality.
 * It handles splash screen, status bar, keyboard, and network status.
 */

import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';

/**
 * Check if running on native mobile platform
 */
export const isNativePlatform = (): boolean => {
    return Capacitor.isNativePlatform();
};

/**
 * Check if running on Android
 */
export const isAndroid = (): boolean => {
    return Capacitor.getPlatform() === 'android';
};

/**
 * Initialize all mobile plugins
 */
export const initializeMobile = async (): Promise<void> => {
    if (!isNativePlatform()) {
        console.log('[Mobile] Running on web, skipping native initialization');
        return;
    }

    console.log('[Mobile] Initializing native plugins...');

    try {
        // Configure Status Bar
        await setupStatusBar();

        // Setup keyboard listeners
        setupKeyboardListeners();

        // Setup app state listeners
        setupAppListeners();

        // Hide splash screen after initialization
        await hideSplashScreen();

        console.log('[Mobile] Native plugins initialized successfully');
    } catch (error) {
        console.error('[Mobile] Error initializing native plugins:', error);
    }
};

/**
 * Configure status bar appearance and enable immersive mode
 */
const setupStatusBar = async (): Promise<void> => {
    if (!isNativePlatform()) return;

    try {
        // Set dark content (light icons on dark background)
        await StatusBar.setStyle({ style: Style.Dark });

        // Set background color to match app theme
        await StatusBar.setBackgroundColor({ color: '#0f172a' });

        // Hide status bar for immersive fullscreen experience
        await StatusBar.hide();

        // Set overlay to true so app content goes behind status bar area
        await StatusBar.setOverlaysWebView({ overlay: true });

        console.log('[Mobile] Status bar configured - immersive mode enabled');
    } catch (error) {
        console.error('[Mobile] Error configuring status bar:', error);
    }
};

/**
 * Setup keyboard event listeners
 */
const setupKeyboardListeners = (): void => {
    if (!isNativePlatform()) return;

    Keyboard.addListener('keyboardWillShow', (info) => {
        console.log('[Mobile] Keyboard will show, height:', info.keyboardHeight);
        document.body.classList.add('keyboard-open');
        document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
    });

    Keyboard.addListener('keyboardWillHide', () => {
        console.log('[Mobile] Keyboard will hide');
        document.body.classList.remove('keyboard-open');
        document.documentElement.style.setProperty('--keyboard-height', '0px');
    });

    console.log('[Mobile] Keyboard listeners registered');
};

/**
 * Setup app lifecycle listeners
 */
const setupAppListeners = (): void => {
    if (!isNativePlatform()) return;

    // Handle back button on Android
    App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
            window.history.back();
        } else {
            // Optional: Show confirm dialog or minimize app
            App.minimizeApp();
        }
    });

    // Handle app state changes
    App.addListener('appStateChange', ({ isActive }) => {
        console.log('[Mobile] App state changed, isActive:', isActive);
        if (isActive) {
            // App came to foreground
            document.dispatchEvent(new CustomEvent('app:resume'));
        } else {
            // App went to background
            document.dispatchEvent(new CustomEvent('app:pause'));
        }
    });

    console.log('[Mobile] App listeners registered');
};

/**
 * Hide splash screen
 */
const hideSplashScreen = async (): Promise<void> => {
    if (!isNativePlatform()) return;

    try {
        await SplashScreen.hide({
            fadeOutDuration: 300,
        });
        console.log('[Mobile] Splash screen hidden');
    } catch (error) {
        console.error('[Mobile] Error hiding splash screen:', error);
    }
};

/**
 * Show splash screen (useful for long operations)
 */
export const showSplashScreen = async (): Promise<void> => {
    if (!isNativePlatform()) return;

    try {
        await SplashScreen.show({
            showDuration: 2000,
            fadeInDuration: 300,
            fadeOutDuration: 300,
        });
    } catch (error) {
        console.error('[Mobile] Error showing splash screen:', error);
    }
};

export default {
    isNativePlatform,
    isAndroid,
    initializeMobile,
    showSplashScreen,
};
