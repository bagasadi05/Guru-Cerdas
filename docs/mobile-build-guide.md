# Mobile APK Build Guide

Panduan untuk membangun aplikasi Portal Guru sebagai APK Android menggunakan Capacitor.

## Prerequisites

1. **Node.js** (v18+) - sudah terinstal
2. **Android Studio** - diperlukan untuk build APK
   - Download: https://developer.android.com/studio
   - Install Android SDK saat setup
3. **Java Development Kit (JDK)** - biasanya termasuk di Android Studio

## Struktur Proyek

```
portal-guru/
├── android/                 # Android native project (auto-generated)
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/public/   # Web app files (synced)
│   │   │   ├── res/             # Icons, splash screens
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── build.gradle
├── capacitor.config.ts      # Capacitor configuration
├── src/
│   └── services/
│       └── mobileInit.ts    # Mobile plugin initialization
└── dist/                    # Built web app
```

## Scripts Tersedia

| Script | Deskripsi |
|--------|-----------|
| `npm run mobile:sync` | Build web app dan sync ke Android |
| `npm run mobile:open` | Buka proyek di Android Studio |
| `npm run mobile:run` | Jalankan di emulator/device yang terhubung |
| `npm run mobile:build` | Build APK debug |

## Build APK Debug

### Langkah Cepat

```bash
# 1. Build dan sync
npm run mobile:sync

# 2. Buka di Android Studio
npm run mobile:open

# 3. Build APK dari Android Studio
# - Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### Lokasi APK Output

APK debug akan tersedia di:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Build APK Release (Production)

### 1. Buat Keystore

```bash
keytool -genkey -v -keystore portal-guru.keystore -alias portal-guru -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Konfigurasi Signing

Edit `android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file("../portal-guru.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "your_password"
            keyAlias "portal-guru"
            keyPassword System.getenv("KEY_PASSWORD") ?: "your_password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. Build Release APK

```bash
cd android
./gradlew assembleRelease
```

APK release akan tersedia di:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Troubleshooting

### "SDK location not found"

Buat file `android/local.properties`:
```properties
sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk
```

### Build gagal dengan error Gradle

```bash
cd android
./gradlew clean
./gradlew build
```

### Web assets tidak ter-sync

```bash
npx cap sync android
```

### Emulator tidak terdeteksi

1. Buka Android Studio
2. Tools > Device Manager
3. Buat/jalankan emulator terlebih dahulu

## Customize App Icon

1. Prepare icon berukuran 1024x1024 px
2. Gunakan Asset Studio di Android Studio:
   - File > New > Image Asset
   - Pilih "Launcher Icons (Adaptive and Legacy)"
   - Pilih source icon Anda

Atau manual replace di:
```
android/app/src/main/res/
├── mipmap-mdpi/      # 48x48
├── mipmap-hdpi/      # 72x72
├── mipmap-xhdpi/     # 96x96
├── mipmap-xxhdpi/    # 144x144
└── mipmap-xxxhdpi/   # 192x192
```

## Customize Splash Screen

Edit `capacitor.config.ts`:

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#0f172a', // Warna background
    spinnerColor: '#6366f1',    // Warna spinner
    showSpinner: true,
  },
}
```

## Testing di Device

### Via USB

1. Aktifkan Developer Options di Android
2. Aktifkan USB Debugging
3. Hubungkan device via USB
4. Jalankan:
   ```bash
   npm run mobile:run
   ```

### Via APK Install

1. Build APK debug
2. Transfer ke device
3. Install APK (aktifkan "Install from unknown sources")

## CI/CD (GitHub Actions)

Contoh workflow untuk automated build:

```yaml
name: Build Android APK

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '17'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build web app
        run: npm run build
        
      - name: Sync Capacitor
        run: npx cap sync android
        
      - name: Build APK
        run: |
          cd android
          ./gradlew assembleDebug
          
      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-debug
          path: android/app/build/outputs/apk/debug/app-debug.apk
```

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio User Guide](https://developer.android.com/studio/intro)
- [Kapasitor Android Deployment](https://capacitorjs.com/docs/android)
