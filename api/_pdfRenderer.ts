import { readFile } from 'fs/promises';
import path from 'path';
import chromium from '@sparticuz/chromium';
import puppeteer, { type Browser, type LaunchOptions } from 'puppeteer-core';
import { ExportHttpError } from './_documentExport';
import {
  PAGE_MARGIN_MM,
  buildHeaderFooterTemplates,
  renderPrintHtml,
  type LessonPlanExportData,
} from '../src/lib/modulAjarExport';

const RENDER_TIMEOUT_MS = 25_000;
const MAX_CONCURRENT_RENDERS = 2;
const FONT_DIR = path.join(process.cwd(), 'node_modules', '@fontsource', 'tinos', 'files');

const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT_RANGE =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

let activeRenders = 0;
let browserPromise: Promise<Browser> | null = null;
let fontCssPromise: Promise<string> | null = null;

/**
 * Serverless Chromium ships without Times New Roman. Tinos is metric-compatible,
 * so it is embedded under both names and the stored inline styles keep working.
 */
async function loadFontFaceCss(): Promise<string> {
  const faces: string[] = [];
  for (const subset of [
    { name: 'latin', range: LATIN_RANGE },
    { name: 'latin-ext', range: LATIN_EXT_RANGE },
  ]) {
    for (const weight of [400, 700]) {
      for (const style of ['normal', 'italic']) {
        try {
          const file = await readFile(path.join(FONT_DIR, `tinos-${subset.name}-${weight}-${style}.woff2`));
          const src = `url(data:font/woff2;base64,${file.toString('base64')}) format('woff2')`;
          for (const family of ['Times New Roman', 'Tinos']) {
            faces.push(
              `@font-face { font-family: '${family}'; font-style: ${style}; font-weight: ${weight}; src: ${src}; unicode-range: ${subset.range}; }`,
            );
          }
        } catch (error) {
          console.warn(`[document-export:pdf] font missing: ${subset.name}-${weight}-${style}`, error);
        }
      }
    }
  }
  return faces.join('\n');
}

async function launchOptions(): Promise<LaunchOptions> {
  const localExecutable = process.env.CHROME_EXECUTABLE_PATH?.trim();
  if (localExecutable) {
    return {
      executablePath: localExecutable,
      args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
      headless: true,
    };
  }
  if (process.platform !== 'linux') {
    throw new ExportHttpError(
      503,
      'RENDERER_UNAVAILABLE',
      'Mesin PDF tidak tersedia di lingkungan ini. Gunakan cetak browser.',
    );
  }
  chromium.setGraphicsMode = false;
  return {
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true,
  };
}

async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    const existing = await browserPromise.catch(() => null);
    if (existing?.connected) return existing;
    browserPromise = null;
  }
  browserPromise = launchOptions().then((options) => puppeteer.launch(options));
  try {
    return await browserPromise;
  } catch (error) {
    browserPromise = null;
    if (error instanceof ExportHttpError) throw error;
    console.error('[document-export:pdf] Chromium failed to launch', error);
    throw new ExportHttpError(503, 'RENDERER_UNAVAILABLE', 'Mesin PDF gagal dijalankan. Coba lagi sebentar.');
  }
}

async function resetBrowser(): Promise<void> {
  const current = browserPromise;
  browserPromise = null;
  const browser = await current?.catch(() => null);
  await browser?.close().catch(() => undefined);
}

function withTimeout<T>(work: Promise<T>, onTimeout: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      reject(
        new ExportHttpError(504, 'TIMEOUT', 'Pembuatan PDF melebihi batas waktu. Coba lagi atau gunakan cetak browser.'),
      );
    }, RENDER_TIMEOUT_MS);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

export async function renderLessonPlanPdf(data: LessonPlanExportData): Promise<Buffer> {
  if (activeRenders >= MAX_CONCURRENT_RENDERS) {
    throw new ExportHttpError(503, 'RENDERER_BUSY', 'Layanan PDF sedang sibuk. Coba lagi beberapa detik lagi.', 5);
  }
  activeRenders += 1;
  let timedOut = false;

  try {
    fontCssPromise ??= loadFontFaceCss();
    const [browser, fontFaceCss] = await Promise.all([getBrowser(), fontCssPromise]);
    const html = renderPrintHtml(data, { fontFaceCss });
    const { headerTemplate, footerTemplate } = buildHeaderFooterTemplates(data);

    const page = await browser.newPage();
    const render = (async () => {
      try {
        await page.setRequestInterception(true);
        page.on('request', (request) => {
          const url = request.url();
          if (url.startsWith('data:') || url === 'about:blank') void request.continue();
          else void request.abort('blockedbyclient');
        });
        await page.setContent(html, { waitUntil: 'load', timeout: RENDER_TIMEOUT_MS });
        await page.evaluate('document.fonts.ready.then(() => true)');
        await page.emulateMediaType('print');
        const margin = `${PAGE_MARGIN_MM}mm`;
        const pdf = await page.pdf({
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          headerTemplate,
          footerTemplate,
          margin: { top: margin, right: margin, bottom: margin, left: margin },
          timeout: RENDER_TIMEOUT_MS,
        });
        return Buffer.from(pdf);
      } finally {
        await page.close().catch(() => undefined);
      }
    })();

    return await withTimeout(render, () => {
      timedOut = true;
    });
  } catch (error) {
    if (timedOut) await resetBrowser();
    if (error instanceof ExportHttpError) throw error;
    console.error('[document-export:pdf] render failed', error);
    throw new ExportHttpError(500, 'RENDER_FAILED', 'PDF gagal dibuat. Coba lagi atau gunakan cetak browser.');
  } finally {
    activeRenders -= 1;
  }
}
