# Vitest + MSW: `node:https` not intercepted

## Problem

MSW's `setupServer` does not intercept `node:https.get()` / `node:https.request()` calls in Vitest, even though it works in bare Node.js. `fetch()` interception works fine in both environments.

## Root cause

In Vitest's module runner, `import * as https from 'node:https'` and `require('node:https')` return **different objects**:

```
import === require: false
import.request === require.request: false
```

MSW's `@mswjs/interceptors` ClientRequest interceptor does `import https from 'node:https'` and patches `https.request = new Proxy(...)`. This patches the `require`-accessible copy, but the `import`-accessible copy (which Vitest wraps in its own namespace) remains unpatched.

Any code using `import * as https from 'node:https'` — or any dependency that snapshots the module at load time (e.g., via `tslib.__importStar`) — sees the unpatched original.

In bare Node.js, `import` and `require` of `node:https` return the **same singleton**, so MSW's patch reaches all consumers.

## Reproduction

```bash
npm install
npm run test            # fails: https.get() → ENOTFOUND
npm run test:node       # passes: same test in bare Node.js
```

## Environment

- Vitest 4.1.9
- MSW 2.14.6
- Node.js 22.x
- macOS (also reproducible on Linux)

## Expected behavior

`node:https.get()` and `node:https.request()` should be intercepted by MSW in Vitest, just as they are in bare Node.js.

## Actual behavior

- `fetch()` → intercepted ✅
- `https.get()` via `import * as https from 'node:https'` → `ENOTFOUND` ❌
- `https.get()` via `require('node:https')` → intercepted ✅ (from test code only; externalized deps still fail)
