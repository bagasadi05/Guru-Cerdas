import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SKILLS_CONFIG = [
  {
    name: 'supabase',
    source: 'supabase/agent-skills',
    sourceType: 'github',
    skillPath: 'skills/supabase/SKILL.md',
    url: 'https://raw.githubusercontent.com/supabase/agent-skills/main/skills/supabase/SKILL.md'
  },
  {
    name: 'supabase-postgres-best-practices',
    source: 'supabase/agent-skills',
    sourceType: 'github',
    skillPath: 'skills/supabase-postgres-best-practices/SKILL.md',
    url: 'https://raw.githubusercontent.com/supabase/agent-skills/main/skills/supabase-postgres-best-practices/SKILL.md'
  },
  {
    name: 'clean-architecture',
    source: 'nathankim0/clean-architecture-skills',
    sourceType: 'github',
    skillPath: 'plugins/clean-architecture/skills/clean-architecture/SKILL.md',
    url: 'https://raw.githubusercontent.com/nathankim0/clean-architecture-skills/main/plugins/clean-architecture/skills/clean-architecture/SKILL.md'
  },
  {
    name: 'kent-beck-style',
    source: 'nathankim0/clean-architecture-skills',
    sourceType: 'github',
    skillPath: 'plugins/kent-beck-style/skills/kent-beck-style/SKILL.md',
    url: 'https://raw.githubusercontent.com/nathankim0/clean-architecture-skills/main/plugins/kent-beck-style/skills/kent-beck-style/SKILL.md'
  },
  {
    name: 'docx',
    source: 'anthropics/skills',
    sourceType: 'github',
    skillPath: 'skills/docx/SKILL.md',
    url: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/docx/SKILL.md'
  },
  {
    name: 'xlsx',
    source: 'anthropics/skills',
    sourceType: 'github',
    skillPath: 'skills/xlsx/SKILL.md',
    url: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/xlsx/SKILL.md'
  },
  {
    name: 'pdf',
    source: 'anthropics/skills',
    sourceType: 'github',
    skillPath: 'skills/pdf/SKILL.md',
    url: 'https://raw.githubusercontent.com/anthropics/skills/main/skills/pdf/SKILL.md'
  },
  {
    name: 'vercel-react-best-practices',
    source: 'vercel-labs/agent-skills',
    sourceType: 'github',
    skillPath: 'skills/react-best-practices/SKILL.md',
    url: 'https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/react-best-practices/SKILL.md'
  },
  {
    name: 'playwright-skill',
    source: 'testdino-hq/playwright-skill',
    sourceType: 'github',
    skillPath: 'SKILL.md',
    url: 'https://raw.githubusercontent.com/testdino-hq/playwright-skill/main/SKILL.md'
  },
  {
    name: 'tanstack-query-best-practices',
    source: 'DeckardGer/tanstack-agent-skills',
    sourceType: 'github',
    skillPath: 'skills/tanstack-query/SKILL.md',
    url: 'https://raw.githubusercontent.com/DeckardGer/tanstack-agent-skills/main/skills/tanstack-query/SKILL.md'
  },
  {
    name: 'pwa-expert',
    source: 'curiositech/some_claude_skills',
    sourceType: 'github',
    skillPath: '.claude/skills/pwa-expert/SKILL.md',
    url: 'https://raw.githubusercontent.com/curiositech/some_claude_skills/main/.claude/skills/pwa-expert/SKILL.md'
  }
];

function sha256(content) {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function fetchSkill(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

async function main() {
  const lockfilePath = path.resolve('skills-lock.json');
  let lockfile = { version: 1, skills: {} };
  if (fs.existsSync(lockfilePath)) {
    try {
      lockfile = JSON.parse(fs.readFileSync(lockfilePath, 'utf8'));
    } catch (e) {
      console.warn('Could not parse skills-lock.json, starting fresh');
    }
  }

  // Also sync existing claude-only skills to .agents/skills
  const claudeOnly = ['thumb-first', 'thumb-first-design', 'thumb-first-platform', 'ui-design-review'];
  for (const name of claudeOnly) {
    const srcDir = path.resolve('.claude', 'skills', name);
    const dstDir = path.resolve('.agents', 'skills', name);
    if (fs.existsSync(srcDir) && !fs.existsSync(dstDir)) {
      console.log(`Syncing ${name} from .claude/skills to .agents/skills`);
      fs.cpSync(srcDir, dstDir, { recursive: true });
    }
  }

  for (const item of SKILLS_CONFIG) {
    console.log(`Fetching ${item.name}...`);
    try {
      const content = await fetchSkill(item.url);
      const hash = sha256(content);

      // Write to .agents/skills/<name>/SKILL.md
      const agentDir = path.resolve('.agents', 'skills', item.name);
      fs.mkdirSync(agentDir, { recursive: true });
      fs.writeFileSync(path.join(agentDir, 'SKILL.md'), content, 'utf8');

      // Write to .claude/skills/<name>/SKILL.md
      const claudeDir = path.resolve('.claude', 'skills', item.name);
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.writeFileSync(path.join(claudeDir, 'SKILL.md'), content, 'utf8');

      // Update lockfile
      lockfile.skills[item.name] = {
        source: item.source,
        sourceType: item.sourceType,
        skillPath: item.skillPath,
        computedHash: hash
      };

      console.log(` Installed ${item.name} (hash: ${hash.slice(0, 8)}...)`);
    } catch (err) {
      console.error(` Error fetching ${item.name}: ${err.message}`);
    }
  }

  // Also handle offline-pwa-sync specifically
  const pwaContent = fs.readFileSync(path.resolve('.agents', 'skills', 'pwa-expert', 'SKILL.md'), 'utf8');
  const offlinePwaSkillContent = `---
name: offline-pwa-sync
description: Offline-first PWA sync and caching strategy for Portal Guru. Use when dealing with Service Workers, IndexedDB, TanStack Query offline cache persistence, background synchronization, offline indicators, and conflict resolution.
---

# Offline PWA & Sync Strategy (Portal Guru)

Integrated guidelines combining PWA Service Worker caching, IndexedDB client-side persistence, TanStack React Query offline persistence, and optimistic mutation sync.

## Portal Guru Architecture Context

- **Frontend:** Vite + React + TypeScript + TailwindCSS
- **Server State & Caching:** \`@tanstack/react-query\` with \`@tanstack/react-query-persist-client\` & \`@tanstack/query-sync-storage-persister\` (IndexedDB/localStorage)
- **Database & Sync:** Supabase Postgres with RLS
- **Local Client Store:** IndexedDB / Dexie or LocalStorage for offline queueing

## Key Offline & Sync Principles

1. **Optimistic Updates with Rollback Context**
   - Apply local state update immediately in \`onMutate\`
   - Snapshot previous state for rollback in \`onError\`
   - Revalidate on network reconnect in \`onSettled\`

2. **Network Mode in TanStack Query**
   - Set \`networkMode: 'offlineFirst'\` for queries that should read from cache even when offline
   - Set \`networkMode: 'always'\` for mutations queued in offline persister

3. **Service Worker Caching Tiers**
   - **Cache-First:** Static assets (fonts, app shell, icons, js/css bundles with hash)
   - **Stale-While-Revalidate:** Frequently read but slow-changing metadata (classes, school profiles, academic years)
   - **Network-First with Cache Fallback:** Active transaction views (attendance, assessment entries, action history)

4. **Offline Queueing & Reconciliation**
   - Queue offline mutations with idempotency keys
   - Replay queue sequentially upon \`window.addEventListener('online')\`
   - Surface clear UI status: Online, Offline (Cached), Syncing (N pending changes)

---

${pwaContent.replace(/^---[\s\S]*?---\n/, '')}
`;

  const offlinePwaAgentDir = path.resolve('.agents', 'skills', 'offline-pwa-sync');
  fs.mkdirSync(offlinePwaAgentDir, { recursive: true });
  fs.writeFileSync(path.join(offlinePwaAgentDir, 'SKILL.md'), offlinePwaSkillContent, 'utf8');

  const offlinePwaClaudeDir = path.resolve('.claude', 'skills', 'offline-pwa-sync');
  fs.mkdirSync(offlinePwaClaudeDir, { recursive: true });
  fs.writeFileSync(path.join(offlinePwaClaudeDir, 'SKILL.md'), offlinePwaSkillContent, 'utf8');

  lockfile.skills['offline-pwa-sync'] = {
    source: 'portal-guru/offline-pwa-sync',
    sourceType: 'local',
    skillPath: 'skills/offline-pwa-sync/SKILL.md',
    computedHash: sha256(offlinePwaSkillContent)
  };

  // Sort keys in lockfile
  const sortedSkills = {};
  Object.keys(lockfile.skills).sort().forEach(k => {
    sortedSkills[k] = lockfile.skills[k];
  });
  lockfile.skills = sortedSkills;

  fs.writeFileSync(lockfilePath, JSON.stringify(lockfile, null, 2) + '\n', 'utf8');
  console.log('skills-lock.json updated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
