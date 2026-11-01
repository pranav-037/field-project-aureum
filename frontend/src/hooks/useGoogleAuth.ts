import { useCallback, useEffect, useRef } from 'react';
import { authApi } from '../services/api';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfig) => void;
          renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
          prompt: () => void;
          disableAutoSelect: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: { credential: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleButtonOptions {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
  logo_alignment?: 'left' | 'center';
}

const GSI_SCRIPT_ID = 'google-gsi-script';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function loadGSIScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(GSI_SCRIPT_ID)) {
      // Already loading / loaded
      if (window.google?.accounts?.id) {
        resolve();
      } else {
        // Wait for it to finish loading
        const existing = document.getElementById(GSI_SCRIPT_ID) as HTMLScriptElement;
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', reject);
      }
      return;
    }
    const script = document.createElement('script');
    script.id = GSI_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export interface UseGoogleAuthOptions {
  /** The user role to pass to the backend on first sign-up */
  role?: string;
  /** Called with { token, user } on successful auth */
  onSuccess: (data: { token: string; user: Record<string, unknown> }) => void;
  /** Called with an error message on failure */
  onError: (message: string) => void;
}

/**
 * Hook that loads the Google Identity Services library and exposes helpers
 * to render the standard Google Sign-In button or trigger the One-Tap prompt.
 *
 * Usage:
 *   const { renderButton, isReady } = useGoogleAuth({ role, onSuccess, onError });
 *   // then: <div ref={buttonRef} /> and call renderButton(buttonRef.current) in a useEffect
 */
export function useGoogleAuth({ role, onSuccess, onError }: UseGoogleAuthOptions) {
  const isReadyRef = useRef(false);

  const handleCredential = useCallback(
    async (credential: string) => {
      try {
        const res = await authApi.googleLogin({ idToken: credential, role });
        if (res.data?.token) {
          localStorage.setItem('aureum_token', res.data.token);
          localStorage.setItem('aureum_user', JSON.stringify(res.data.user));
          onSuccess(res.data);
        } else {
          onError('Unexpected response from authentication server');
        }
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err instanceof Error ? err.message : 'Google sign-in failed');
        onError(message);
      }
    },
    [role, onSuccess, onError]
  );

  useEffect(() => {
    if (!CLIENT_ID) return;
    loadGSIScript()
      .then(() => {
        window.google!.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => handleCredential(response.credential),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        isReadyRef.current = true;
      })
      .catch((e) => console.error('Failed to load Google GSI script:', e));
  }, [handleCredential]);

  const renderButton = useCallback((container: HTMLElement | null, options?: GoogleButtonOptions) => {
    if (!container || !window.google?.accounts?.id) return;
    window.google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: container.offsetWidth || 320,
      ...options,
    });
  }, []);

  return {
    isConfigured: Boolean(CLIENT_ID),
    renderButton,
  };
}
