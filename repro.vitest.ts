/**
 * Minimal reproduction: MSW setupServer does not intercept node:https.request
 * in Vitest, even though it works in bare Node.js.
 *
 * Run with: npx vitest run
 * Compare:  npm run test:node  (bare Node — passes)
 */
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import * as https from 'node:https';

const server = setupServer(
  http.get('https://test.fake/api', () =>
    HttpResponse.json({ intercepted: true }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

describe('MSW + node:https in Vitest', () => {
  it('intercepts fetch() — works', async () => {
    const res = await fetch('https://test.fake/api');
    expect(await res.json()).toEqual({ intercepted: true });
  });

  it('intercepts https.get() — fails with ENOTFOUND', async () => {
    const body = await new Promise<string>((resolve, reject) => {
      https
        .get('https://test.fake/api', (res) => {
          let data = '';
          res.on('data', (c: Buffer) => (data += c.toString()));
          res.on('end', () => resolve(data));
        })
        .on('error', reject);
    });
    expect(JSON.parse(body)).toEqual({ intercepted: true });
  });

  it('shows import and require return different module objects', () => {
    const httpsRequire = require('node:https');
    // In bare Node.js these are the same object. In Vitest they differ.
    console.log('import === require:', https === httpsRequire);
    console.log('import.request === require.request:', https.request === httpsRequire.request);
    // require'd copy IS patched (Proxy), but import'd copy is NOT
    expect(typeof https.request).toBe('function');
  });
});
