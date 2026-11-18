const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clone: () => {
      const copy = storage();
      for (const [key, value] of values) copy.setItem(key, value);
      return copy;
    },
  };
}

const source = readFileSync(path.join(__dirname, '../src/services/supabase.ts'), 'utf8')
  .replaceAll('import.meta.env', 'testEnv');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function openTab(sessionStorage, pathname = '/collector/dashboard', navigationType = 'navigate') {
  let options;
  const exported = {};
  vm.runInNewContext(outputText, {
    exports: exported,
    require: () => ({
      createClient: (url, key, config) => {
        options = config.auth;
        return createClient(url, key, { auth: { ...config.auth, autoRefreshToken: false } });
      },
    }),
    testEnv: { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_ANON_KEY: 'public-test-key' },
    window: { sessionStorage, location: { pathname } },
    crypto: { randomUUID },
    performance: { getEntriesByType: () => [{ type: navigationType }] },
    URL,
  });
  return { client: exported.supabase, options };
}

async function run() {
  const firstStorage = storage();
  const first = openTab(firstStorage);
  await first.client.auth.getSession();
  const session = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'account-a', email: 'account-a@example.com' },
  };
  firstStorage.setItem(first.options.storageKey, JSON.stringify(session));
  assert.equal((await first.client.auth.getSession()).data.session.user.id, 'account-a');

  const second = openTab(storage());
  assert.notEqual(first.options.storageKey, second.options.storageKey);
  assert.equal((await second.client.auth.getSession()).data.session, null);
  assert.equal(first.options.autoRefreshToken, true);
  assert.equal(first.options.detectSessionInUrl, false);
  const cloned = openTab(firstStorage.clone());
  assert.notEqual(cloned.options.storageKey, first.options.storageKey);
  assert.equal((await cloned.client.auth.getSession()).data.session, null);
  await first.client.auth.dispose();

  const refreshed = openTab(firstStorage, '/collector/dashboard', 'reload');
  assert.equal(refreshed.options.storageKey, first.options.storageKey);
  assert.equal((await refreshed.client.auth.getSession()).data.session.user.id, 'account-a');

  const callback = openTab(storage(), '/auth/callback');
  const recovery = openTab(storage(), '/reset-password');
  assert.equal(callback.options.detectSessionInUrl, true);
  assert.equal(recovery.options.detectSessionInUrl, true);
  await Promise.all([second, cloned, refreshed, callback, recovery].map(({ client }) => client.auth.dispose()));
  console.log('Fresh-tab isolation, separate auth channels, same-tab restoration, and callback configuration passed.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
