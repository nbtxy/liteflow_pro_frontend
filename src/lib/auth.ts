import { getApiUrl } from './config';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
type RefreshStatus = 'ok' | 'invalid' | 'unavailable';

let refreshInFlight: Promise<RefreshResult> | null = null;

export interface RefreshResult {
  accessToken: string | null;
  status: RefreshStatus;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function doRefreshAccessToken(): Promise<RefreshResult> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return { accessToken: null, status: 'invalid' };
  }

  try {
    const res = await fetch(getApiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      if (res.status === 400 || res.status === 401) {
        clearTokens();
        return { accessToken: null, status: 'invalid' };
      }
      return { accessToken: null, status: 'unavailable' };
    }
    const json = await res.json();
    if (json.code !== 200) {
      if (json.code === 40101 || json.code === 40102) {
        clearTokens();
        return { accessToken: null, status: 'invalid' };
      }
      return { accessToken: null, status: 'unavailable' };
    }
    const data = json.data;
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
    return { accessToken: data.accessToken, status: 'ok' };
  } catch {
    return { accessToken: null, status: 'unavailable' };
  }
}

export async function refreshAccessToken(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = doRefreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}
