#!/usr/bin/env node
// Pre-push reminder (see .githooks/pre-push and docs/release-notes.md).
// Pushing app changes to main without touching public/release-notes.json means
// teachers get the "Versi baru tersedia" dialog without a list of changes.
//
// Reads git's pre-push refs from stdin. Exit codes:
//   0 = nothing to remind about, 1 = app changed but release notes did not.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const NOTES_FILE = 'public/release-notes.json';
const DEPLOY_REF = 'refs/heads/main';
const ZERO_SHA = /^0+$/;
const APP_PATHS = [/^src\//, /^public\//, /^index\.html$/];
const NOT_APP = [/(^|\/)__tests__\//, /\.(test|spec)\.[cm]?[jt]sx?$/, /^public\/release-notes\.json$/];

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();

function changedFiles(remoteSha, localSha) {
    let base = remoteSha;
    if (ZERO_SHA.test(remoteSha)) {
        try {
            base = git('merge-base', localSha, 'origin/main');
        } catch {
            return [];
        }
    }
    const out = git('diff', '--name-only', base, localSha);
    return out ? out.split('\n') : [];
}

const lines = readFileSync(0, 'utf8').split('\n').filter(Boolean);
const files = new Set();
for (const line of lines) {
    const [, localSha, remoteRef, remoteSha] = line.split(' ');
    if (remoteRef !== DEPLOY_REF || !localSha || ZERO_SHA.test(localSha)) continue;
    for (const f of changedFiles(remoteSha, localSha)) files.add(f);
}

const appFiles = [...files].filter(f => APP_PATHS.some(p => p.test(f)) && !NOT_APP.some(p => p.test(f)));
if (appFiles.length === 0 || files.has(NOTES_FILE)) process.exit(0);

const shown = appFiles.slice(0, 5).map(f => `    - ${f}`).join('\n');
const more = appFiles.length > 5 ? `\n    ... dan ${appFiles.length - 5} file lain` : '';
process.stderr.write(`
⚠  Catatan rilis belum diperbarui.
   Push ini mengubah aplikasi:
${shown}${more}
   tetapi ${NOTES_FILE} tidak berubah. Guru akan melihat jendela
   "Versi baru tersedia" tanpa daftar perubahan.
   Tambahkan entri baru di paling atas file itu (lihat docs/release-notes.md).

`);
process.exit(1);
