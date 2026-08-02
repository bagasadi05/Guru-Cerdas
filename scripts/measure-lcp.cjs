/**
 * measure-lcp.cjs — measure Largest Contentful Paint (LCP) per URL.
 *
 * Usage: node scripts/measure-lcp.cjs [--runs N] [--tag NAME]
 *   --runs  Number of Lighthouse runs per URL (default 3)
 *   --tag   Output/display tag, e.g. "baseline" or "after-preload" (default "run")
 *
 * Requires the app to already be served at http://localhost:4173
 * (e.g. `npx vite preview --port 4173 --strictPort`).
 *
 * Uses the same desktop emulation + throttling as lighthouserc.cjs
 * (1350x940, 40ms RTT, 10 Mbps) so numbers are comparable with lhci runs.
 * LHR JSONs are saved under .lcp-measure/<tag>-<url>-<run>.json
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const runs = parseInt(argv[argv.indexOf('--runs') + 1] || '3', 10);
const tag = argv[argv.indexOf('--tag') + 1] || 'run';

const root = path.join(__dirname, '..');
const base = 'http://localhost:4173';
const urls = ['/', '/guru-login'];
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const outDir = path.join(root, '.lcp-measure');
fs.mkdirSync(outDir, { recursive: true });

const settings = [
  '--quiet',
  '--output=json',
  '--only-categories=performance',
  '--chrome-path=' + JSON.stringify(CHROME),
  '--form-factor=desktop',
  '--screenEmulation.width=1350',
  '--screenEmulation.height=940',
  '--screenEmulation.mobile=false',
  '--throttling-method=devtools',
  '--throttling.rttMs=40',
  '--throttling.throughputKbps=10240',
  '--throttling.cpuSlowdownMultiplier=1',
];

const results = {};
for (const u of urls) {
  const key = u === '/' ? 'root' : u.replace(/[^a-z0-9]/gi, '_');
  const lcps = [];
  for (let i = 1; i <= runs; i++) {
    const outFile = path.join(outDir, `${tag}-${key}-${i}.json`);
    const cmd = `"${path.join(root, 'node_modules', '.bin', 'lighthouse')}" ${settings.join(' ')} --output-path="${outFile}" "${base}${u}"`;
    try {
      execSync(cmd, { stdio: ['ignore', 'inherit', 'inherit'], cwd: root, env: { ...process.env, CHROME_PATH: CHROME } });
    } catch (e) {
      console.error(`[measure-lcp] lighthouse failed for ${u} (run ${i}): ${e.message.split('\n')[0]}`);
      continue;
    }
    let lcp = null;
    try {
      const r = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      lcp = r.audits && r.audits['largest-contentful-paint']
        ? r.audits['largest-contentful-paint'].numericValue
        : null;
    } catch (e) {
      console.error(`[measure-lcp] cannot parse ${outFile}`);
    }
    if (lcp != null) {
      lcps.push(lcp);
      console.log(`${tag} ${u} run${i} LCP=${(lcp / 1000).toFixed(2)}s`);
    }
  }
  if (lcps.length) {
    const sorted = [...lcps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    results[u] = median;
    console.log(`${tag} ${u} MEDIAN=${(median / 1000).toFixed(2)}s (runs: ${lcps.map((v) => (v / 1000).toFixed(2)).join(', ')})`);
  } else {
    console.log(`${tag} ${u} NO VALID RUNS`);
  }
}
console.log(`[measure-lcp] done. tag=${tag}`);
