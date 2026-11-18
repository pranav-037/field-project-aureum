import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getTabAuthOptions(url: string) {
  const project = new URL(url).hostname;
  const tabKey = `aureum-${project}-auth-tab`;
  let tabId = window.sessionStorage.getItem(tabKey);
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  // Browsers can copy sessionStorage into a newly opened or duplicated tab.
  if (tabId && navigation?.type === 'navigate') {
    const previousKey = `aureum-${project}-${tabId}-auth`;
    window.sessionStorage.removeItem(previousKey);
    window.sessionStorage.removeItem(`${previousKey}-code-verifier`);
    window.sessionStorage.removeItem(`${previousKey}-user`);
    tabId = null;
  }
  if (!tabId) {
    tabId = crypto.randomUUID();
    window.sessionStorage.setItem(tabKey, tabId);
  }

  // Each tab needs a distinct storage key to isolate Supabase's BroadcastChannel too.
  return {
    storage: window.sessionStorage,
    storageKey: `aureum-${project}-${tabId}-auth`,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: window.location.pathname === '/auth/callback' ||
      window.location.pathname === '/reset-password',
  };
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, { auth: getTabAuthOptions(supabaseUrl) })
  : null;

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Supabase Auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.'
    );
  }
  return supabase;
}
