import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

// A stand-in for the guru-cerdas-wa service.
let nextReply = { status: 200, body: { ok: true, id: '3EB0ABC' } };
let connected = true;
const received = [];
const server = createServer((req, res) => {
  let raw = '';
  req.on('data', chunk => { raw += chunk; });
  req.on('end', () => {
    if (req.headers['x-auth-token'] !== 'test-token') {
      res.writeHead(401).end(JSON.stringify({ ok: false }));
      return;
    }
    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ connected }));
      return;
    }
    received.push(JSON.parse(raw));
    res.writeHead(nextReply.status, { 'Content-Type': 'application/json' }).end(JSON.stringify(nextReply.body));
  });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
after(() => server.close());

process.env.WA_SERVICE_URL = `http://127.0.0.1:${server.address().port}`;
process.env.WA_SERVICE_TOKEN = 'test-token';
const transport = await import('./http-transport.mjs');

test('isReady follows the service connection state', async () => {
  connected = true;
  assert.equal(await transport.isReady(), true);
  connected = false;
  assert.equal(await transport.isReady(), false);
});

test('send forwards phone and message and returns the WhatsApp id', async () => {
  nextReply = { status: 200, body: { ok: true, id: '3EB0ABC' } };
  const receipt = await transport.send({ id: 'x', phone: '6281234567890', message: 'Laporan' });
  assert.deepEqual(receipt, { wa_id: '3EB0ABC' });
  assert.deepEqual(received.at(-1), { phone: '6281234567890', message: 'Laporan' });
});

test('an explicit notAttempted answer is marked as not sent', async () => {
  nextReply = { status: 503, body: { ok: false, notAttempted: true } };
  await assert.rejects(transport.send({ id: 'x', phone: '62', message: 'm' }), error => error.deliveryNotAttempted === true);
});

test('any other failure stays an unknown outcome', async () => {
  nextReply = { status: 500, body: { ok: false } };
  await assert.rejects(transport.send({ id: 'x', phone: '62', message: 'm' }), error => error.deliveryNotAttempted !== true);
  nextReply = { status: 200, body: { ok: true } }; // no id
  await assert.rejects(transport.send({ id: 'x', phone: '62', message: 'm' }), error => error.deliveryNotAttempted !== true);
});
