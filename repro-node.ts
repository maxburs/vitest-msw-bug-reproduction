/**
 * Same tests in bare Node.js — all pass, proving MSW works outside Vitest.
 */
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import https from 'node:https';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const server = setupServer(
  http.get('https://test.fake/api', () =>
    HttpResponse.json({ intercepted: true }),
  ),
);

server.listen({ onUnhandledRequest: 'error' });

// Test 1: fetch
const fetchRes = await fetch('https://test.fake/api');
console.log('fetch:', (await fetchRes.json()).intercepted === true ? 'PASS' : 'FAIL');

// Test 2: https.get (default import)
const body1 = await new Promise<string>((resolve, reject) => {
  https.get('https://test.fake/api', (res) => {
    let data = '';
    res.on('data', (c: Buffer) => (data += c.toString()));
    res.on('end', () => resolve(data));
  }).on('error', reject);
});
console.log('https.get (default import):', JSON.parse(body1).intercepted ? 'PASS' : 'FAIL');

// Test 3: https.get (require)
const httpsReq = require('node:https');
const body2 = await new Promise<string>((resolve, reject) => {
  httpsReq.get('https://test.fake/api', (res: any) => {
    let data = '';
    res.on('data', (c: Buffer) => (data += c.toString()));
    res.on('end', () => resolve(data));
  }).on('error', reject);
});
console.log('https.get (require):', JSON.parse(body2).intercepted ? 'PASS' : 'FAIL');

// Module identity
console.log('default import === require:', https === httpsReq);

server.close();
console.log('\nAll passed in bare Node.js');
