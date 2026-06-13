import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const tutorialsDir = './public/images/tutorials';
const publicDir = './public';

async function convertPngToWebp(filePath, destPath) {
    try {
        console.log(`Converting ${filePath} -> ${destPath}...`);
        await sharp(filePath)
            .webp({ quality: 80 })
            .toFile(destPath);
        
        // Delete original png file
        fs.unlinkSync(filePath);
        console.log(`Deleted original: ${filePath}`);
    } catch (err) {
        console.error(`Error converting ${filePath}:`, err);
    }
}

async function run() {
    // 1. Convert tutorials
    if (fs.existsSync(tutorialsDir)) {
        const files = fs.readdirSync(tutorialsDir);
        for (const file of files) {
            if (path.extname(file).toLowerCase() === '.png') {
                const srcPath = path.join(tutorialsDir, file);
                const destPath = path.join(tutorialsDir, path.basename(file, '.png') + '.webp');
                await convertPngToWebp(srcPath, destPath);
            }
        }
    }

    // 2. Convert splashscreen
    const splashPath = path.join(publicDir, 'splashscreen.png');
    const splashWebpPath = path.join(publicDir, 'splashscreen.webp');
    if (fs.existsSync(splashPath)) {
        await convertPngToWebp(splashPath, splashWebpPath);
    }

    console.log('Conversion complete!');
}

run();
