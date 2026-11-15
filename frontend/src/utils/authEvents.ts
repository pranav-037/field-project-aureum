export const AUTH_INVALID_EVENT = 'aureum:auth-invalid';

const AUTH_STORAGE_KEYS = ['aureum_token', 'token', 'aureum_user', 'user'];

export function clearStoredAuth(): void {
  try {
    for (const key of AUTH_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to clear stored authentication data:', error);
  }
}

export function invalidateStoredAuth(): void {
  clearStoredAuth();
  window.dispatchEvent(new Event(AUTH_INVALID_EVENT));
}
