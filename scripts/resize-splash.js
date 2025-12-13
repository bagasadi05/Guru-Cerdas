/**
 * Resize splash screen images for Android
 * Run with: node scripts/resize-splash.js
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT = path.join(__dirname, '..', 'public', 'splashscreen.png');
const RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

// Android splash screen sizes (portrait)
const PORTRAIT_SIZES = {
    'drawable-port-mdpi': { width: 320, height: 480 },
    'drawable-port-hdpi': { width: 480, height: 800 },
    'drawable-port-xhdpi': { width: 720, height: 1280 },
    'drawable-port-xxhdpi': { width: 960, height: 1600 },
    'drawable-port-xxxhdpi': { width: 1280, height: 1920 },
};

// Android splash screen sizes (landscape)
const LANDSCAPE_SIZES = {
    'drawable-land-mdpi': { width: 480, height: 320 },
    'drawable-land-hdpi': { width: 800, height: 480 },
    'drawable-land-xhdpi': { width: 1280, height: 720 },
    'drawable-land-xxhdpi': { width: 1600, height: 960 },
    'drawable-land-xxxhdpi': { width: 1920, height: 1280 },
};

async function resizeSplash() {
    console.log('Resizing splash screens...');

    // Resize portrait
    for (const [folder, size] of Object.entries(PORTRAIT_SIZES)) {
        const outputPath = path.join(RES_DIR, folder, 'splash.png');
        await sharp(INPUT)
            .resize(size.width, size.height, { fit: 'cover' })
            .png({ quality: 80, compressionLevel: 9 })
            .toFile(outputPath);
        console.log(`✓ ${folder}: ${size.width}x${size.height}`);
    }

    // Resize landscape
    for (const [folder, size] of Object.entries(LANDSCAPE_SIZES)) {
        const outputPath = path.join(RES_DIR, folder, 'splash.png');
        await sharp(INPUT)
            .resize(size.width, size.height, { fit: 'cover' })
            .png({ quality: 80, compressionLevel: 9 })
            .toFile(outputPath);
        console.log(`✓ ${folder}: ${size.width}x${size.height}`);
    }

    // Also create default drawable
    const drawablePath = path.join(RES_DIR, 'drawable', 'splash.png');
    await sharp(INPUT)
        .resize(480, 800, { fit: 'cover' })
        .png({ quality: 80, compressionLevel: 9 })
        .toFile(drawablePath);
    console.log('✓ drawable: 480x800');

    console.log('\nDone! All splash screens resized.');
}

resizeSplash().catch(console.error);
