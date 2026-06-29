/**
 * Load Test Script - Guru Cerdas
 * Simulasi 60 pengguna mengakses website secara bersamaan
 * 
 * Cara pakai:
 *   node scripts/load-test.js
 *   node scripts/load-test.js --users 100
 *   node scripts/load-test.js --users 60 --rounds 3
 */

import https from 'https';
import http from 'http';

// ==========================================
// KONFIGURASI
// ==========================================
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};

const BASE_URL = getArg('url', 'https://www.guru-cerdas.my.id');
const CONCURRENT_USERS = parseInt(getArg('users', '60'));
const ROUNDS = parseInt(getArg('rounds', '1'));

// Halaman-halaman yang akan diuji
const ENDPOINTS = [
  { path: '/', name: 'Halaman Utama' },
  { path: '/login', name: 'Halaman Login' },
];

// ==========================================
// UTILITAS
// ==========================================
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

function c(color, text) {
  return `${colors[color]}${text}${colors.reset}`;
}

function formatMs(ms) {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`;
}

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ==========================================
// FUNGSI REQUEST
// ==========================================
function makeRequest(url) {
  return new Promise((resolve) => {
    const start = performance.now();
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: 30000 }, (res) => {
      let dataSize = 0;
      res.on('data', (chunk) => { dataSize += chunk.length; });
      res.on('end', () => {
        const duration = performance.now() - start;
        resolve({
          status: res.statusCode,
          duration,
          dataSize,
          success: res.statusCode >= 200 && res.statusCode < 400,
          error: null,
        });
      });
    });

    req.on('error', (err) => {
      const duration = performance.now() - start;
      resolve({
        status: 0,
        duration,
        dataSize: 0,
        success: false,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const duration = performance.now() - start;
      resolve({
        status: 0,
        duration,
        dataSize: 0,
        success: false,
        error: 'Request timeout (30s)',
      });
    });
  });
}

// ==========================================
// FUNGSI TEST
// ==========================================
async function runEndpointTest(endpoint, userCount) {
  const url = `${BASE_URL}${endpoint.path}`;
  
  console.log(`\n  ${c('cyan', '▶')} Menguji ${c('bright', endpoint.name)} (${url})`);
  console.log(`    Mengirim ${c('bright', userCount)} request secara bersamaan...`);

  const start = performance.now();
  
  // Kirim semua request secara bersamaan
  const promises = Array.from({ length: userCount }, () => makeRequest(url));
  const results = await Promise.all(promises);

  const totalTime = performance.now() - start;
  
  // Hitung statistik
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const durations = results.map(r => r.duration);
  const successDurations = successful.map(r => r.duration);

  const stats = {
    total: results.length,
    success: successful.length,
    failed: failed.length,
    successRate: ((successful.length / results.length) * 100).toFixed(1),
    totalTime,
    avg: durations.reduce((a, b) => a + b, 0) / durations.length,
    min: Math.min(...durations),
    max: Math.max(...durations),
    p50: percentile(durations, 50),
    p90: percentile(durations, 90),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    totalDataKB: (results.reduce((a, r) => a + r.dataSize, 0) / 1024).toFixed(1),
    errors: failed.map(r => r.error).filter(Boolean),
  };

  // Tampilkan hasil
  const rateColor = stats.successRate >= 99 ? 'green' : stats.successRate >= 90 ? 'yellow' : 'red';
  
  console.log(`    ┌─────────────────────────────────────────────────────┐`);
  console.log(`    │  Sukses: ${c(rateColor, `${stats.success}/${stats.total}`)} (${c(rateColor, `${stats.successRate}%`)})${' '.repeat(Math.max(0, 33 - `${stats.success}/${stats.total} (${stats.successRate}%)`.length))}│`);
  console.log(`    │  Waktu Total: ${formatMs(stats.totalTime)}${' '.repeat(Math.max(0, 37 - formatMs(stats.totalTime).length))}│`);
  console.log(`    │  Data Diterima: ${stats.totalDataKB} KB${' '.repeat(Math.max(0, 34 - `${stats.totalDataKB} KB`.length))}│`);
  console.log(`    ├─────────────────────────────────────────────────────┤`);
  console.log(`    │  Response Time:                                     │`);
  console.log(`    │    Min:  ${formatMs(stats.min)}${' '.repeat(Math.max(0, 43 - formatMs(stats.min).length))}│`);
  console.log(`    │    Avg:  ${formatMs(stats.avg)}${' '.repeat(Math.max(0, 43 - formatMs(stats.avg).length))}│`);
  console.log(`    │    P50:  ${formatMs(stats.p50)}${' '.repeat(Math.max(0, 43 - formatMs(stats.p50).length))}│`);
  console.log(`    │    P90:  ${formatMs(stats.p90)}${' '.repeat(Math.max(0, 43 - formatMs(stats.p90).length))}│`);
  console.log(`    │    P95:  ${formatMs(stats.p95)}${' '.repeat(Math.max(0, 43 - formatMs(stats.p95).length))}│`);
  console.log(`    │    P99:  ${formatMs(stats.p99)}${' '.repeat(Math.max(0, 43 - formatMs(stats.p99).length))}│`);
  console.log(`    │    Max:  ${formatMs(stats.max)}${' '.repeat(Math.max(0, 43 - formatMs(stats.max).length))}│`);
  console.log(`    └─────────────────────────────────────────────────────┘`);

  if (stats.errors.length > 0) {
    const uniqueErrors = [...new Set(stats.errors)];
    console.log(`    ${c('red', '⚠ Error:')}`);
    uniqueErrors.forEach(err => console.log(`      - ${err}`));
  }

  return stats;
}

async function runLoadTest() {
  console.log(`\n${c('bright', '═══════════════════════════════════════════════════════════')}`);
  console.log(`${c('bright', '  🚀 LOAD TEST — Guru Cerdas')}`);
  console.log(`${c('bright', '═══════════════════════════════════════════════════════════')}`);
  console.log(`  Target:     ${c('cyan', BASE_URL)}`);
  console.log(`  Pengguna:   ${c('cyan', CONCURRENT_USERS + ' bersamaan')}`);
  console.log(`  Ronde:      ${c('cyan', ROUNDS + 'x')}`);
  console.log(`  Endpoint:   ${c('cyan', ENDPOINTS.length + ' halaman')}`);
  console.log(`  Waktu:      ${c('dim', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }))}`);

  const allStats = [];

  for (let round = 1; round <= ROUNDS; round++) {
    console.log(`\n${c('bright', `──── Ronde ${round}/${ROUNDS} ────`)}`);

    for (const endpoint of ENDPOINTS) {
      const stats = await runEndpointTest(endpoint, CONCURRENT_USERS);
      allStats.push({ endpoint: endpoint.name, round, ...stats });
    }

    // Jeda antar ronde
    if (round < ROUNDS) {
      console.log(`\n  ${c('dim', '⏳ Jeda 3 detik sebelum ronde berikutnya...')}`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // ==========================================
  // RINGKASAN AKHIR
  // ==========================================
  console.log(`\n${c('bright', '═══════════════════════════════════════════════════════════')}`);
  console.log(`${c('bright', '  📊 RINGKASAN HASIL')}`);
  console.log(`${c('bright', '═══════════════════════════════════════════════════════════')}`);

  const totalRequests = allStats.reduce((a, s) => a + s.total, 0);
  const totalSuccess = allStats.reduce((a, s) => a + s.success, 0);
  const totalFailed = allStats.reduce((a, s) => a + s.failed, 0);
  const overallRate = ((totalSuccess / totalRequests) * 100).toFixed(1);
  const avgResponse = allStats.reduce((a, s) => a + s.avg, 0) / allStats.length;
  const worstP95 = Math.max(...allStats.map(s => s.p95));

  const overallColor = overallRate >= 99 ? 'green' : overallRate >= 90 ? 'yellow' : 'red';

  console.log(`  Total Request:   ${totalRequests}`);
  console.log(`  Berhasil:        ${c('green', totalSuccess)}`);
  console.log(`  Gagal:           ${c(totalFailed > 0 ? 'red' : 'green', totalFailed)}`);
  console.log(`  Success Rate:    ${c(overallColor, overallRate + '%')}`);
  console.log(`  Avg Response:    ${formatMs(avgResponse)}`);
  console.log(`  Worst P95:       ${formatMs(worstP95)}`);

  // Penilaian
  console.log(`\n${c('bright', '  📋 PENILAIAN:')}`);
  
  if (overallRate >= 99 && worstP95 < 3000) {
    console.log(`  ${c('green', '  ✅ LULUS — Website siap menangani ' + CONCURRENT_USERS + ' pengguna bersamaan!')}`);
  } else if (overallRate >= 95 && worstP95 < 5000) {
    console.log(`  ${c('yellow', '  ⚠️  CUKUP — Website bisa menangani beban, tapi ada ruang untuk perbaikan.')}`);
  } else {
    console.log(`  ${c('red', '  ❌ PERLU PERBAIKAN — Website mengalami kesulitan di bawah beban ini.')}`);
  }

  if (worstP95 >= 5000) {
    console.log(`  ${c('yellow', '  💡 Tips: P95 response time > 5 detik. Pertimbangkan caching atau optimasi server.')}`);
  }

  console.log(`\n${c('dim', '  Catatan: Test ini mengukur waktu respon HTTP dari server.')}`);
  console.log(`${c('dim', '  Waktu muat di browser pengguna bisa berbeda karena aset JS/CSS/gambar.')}`);
  console.log('');
}

// ==========================================
// JALANKAN
// ==========================================
runLoadTest().catch(console.error);
