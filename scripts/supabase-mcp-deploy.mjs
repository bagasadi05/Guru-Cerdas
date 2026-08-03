// Helper: drives the @supabase/mcp-server-supabase stdio server via JSON-RPC
// Usage:
//   node scripts/supabase-mcp-deploy.mjs list
//   node scripts/supabase-mcp-deploy.mjs get <slug>
//   node scripts/supabase-mcp-deploy.mjs deploy-r2
//   node scripts/supabase-mcp-deploy.mjs deploy-worker
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

const REF = process.env.SUPABASE_PROJECT_REF || 'fddvcyqbfqydvsfujcxd';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN not set');
  process.exit(1);
}

const mode = process.argv[2] || 'list';
const arg = process.argv[3];

const server = spawn('npx', ['-y', '@supabase/mcp-server-supabase@latest', '--project-ref', REF], {
  env: { ...process.env, SUPABASE_ACCESS_TOKEN: TOKEN },
  shell: true,
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buffer = '';
const pending = new Map();
let nextId = 1;

server.stdout.on('data', (chunk) => {
  buffer += chunk.toString();
  let idx;
  while ((idx = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id && pending.has(msg.id)) {
        const { resolve } = pending.get(msg.id);
        pending.delete(msg.id);
        resolve(msg);
      }
    } catch {
      /* ignore non-JSON noise */
    }
  }
});
server.stderr.on('data', (d) => process.stderr.write(d));

function call(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout waiting for ${method}`));
    }, 180000);
    pending.set(id, {
      resolve: (msg) => {
        clearTimeout(timer);
        resolve(msg);
      },
    });
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

async function toolCall(name, argsObj) {
  const res = await call('tools/call', { name, arguments: argsObj });
  if (res.error) {
    throw new Error(`MCP error: ${JSON.stringify(res.error)}`);
  }
  const content = res.result?.content || [];
  for (const c of content) {
    if (c.type === 'text' && c.text) {
      try {
        return JSON.parse(c.text);
      } catch {
        return c.text;
      }
    }
  }
  return res.result;
}

async function init() {
  await call('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'buffy-deploy', version: '1.0.0' },
  });
  server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
}

function read(name) {
  return readFileSync(name, 'utf8');
}

const R2_FILES = [
  { name: 'supabase/functions/r2-storage/index.ts', content: read('supabase/functions/r2-storage/index.ts') },
  { name: 'supabase/functions/r2-storage/deno.json', content: read('supabase/functions/r2-storage/deno.json') },
];

const WORKER_FILES = [
  { name: 'supabase/functions/modul-ajar-ai-worker/index.ts', content: read('supabase/functions/modul-ajar-ai-worker/index.ts') },
  { name: 'supabase/functions/_shared/ai/errors.ts', content: read('supabase/functions/_shared/ai/errors.ts') },
  { name: 'supabase/functions/_shared/ai/geminiAdapter.ts', content: read('supabase/functions/_shared/ai/geminiAdapter.ts') },
  { name: 'supabase/functions/_shared/ai/providerRouter.ts', content: read('supabase/functions/_shared/ai/providerRouter.ts') },
  { name: 'supabase/functions/_shared/ai/types.ts', content: read('supabase/functions/_shared/ai/types.ts') },
  { name: 'supabase/functions/_shared/modul-ajar/normalize.ts', content: read('supabase/functions/_shared/modul-ajar/normalize.ts') },
  { name: 'supabase/functions/_shared/modul-ajar/schema.ts', content: read('supabase/functions/_shared/modul-ajar/schema.ts') },
  { name: 'supabase/functions/_shared/modul-ajar/syntaxResolver.ts', content: read('supabase/functions/_shared/modul-ajar/syntaxResolver.ts') },
];

await init();

try {
  if (mode === 'list') {
    const list = await toolCall('list_edge_functions', {});
    console.log(JSON.stringify(list, null, 2));
  } else if (mode === 'get') {
    const fn = await toolCall('get_edge_function', { function_slug: arg });
    console.log(JSON.stringify(fn, null, 2));
  } else if (mode === 'deploy-r2') {
    const result = await toolCall('deploy_edge_function', {
      name: 'r2-storage',
      entrypoint_path: 'supabase/functions/r2-storage/index.ts',
      import_map_path: 'supabase/functions/r2-storage/deno.json',
      verify_jwt: false,
      files: R2_FILES,
    });
    console.log(JSON.stringify(result, null, 2));
  } else if (mode === 'deploy-worker') {
    const result = await toolCall('deploy_edge_function', {
      name: 'modul-ajar-ai-worker',
      entrypoint_path: 'supabase/functions/modul-ajar-ai-worker/index.ts',
      verify_jwt: false,
      files: WORKER_FILES,
    });
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.error('Unknown mode:', mode);
    process.exitCode = 1;
  }
} catch (e) {
  console.error('ERROR:', e.message);
  process.exitCode = 1;
} finally {
  server.stdin.end();
  setTimeout(() => server.kill(), 2000);
}
