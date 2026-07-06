export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface AccountSummary {
  balance: number;
  lifetimePoints: number;
  tier: 'nowicjusz' | 'staly' | 'klub';
}

export interface LedgerEntry {
  id: string;
  kind: 'EARN' | 'REDEEM' | 'ADJUST';
  points: number;
  reason: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  code: string;
  name: string;
  costPoints: number;
}

let accessToken = '';
export const setAccess = (t: string) => (accessToken = t);

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; detail?: string };
    throw new Error(body.message ?? body.detail ?? `${res.status} ${res.statusText}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  login: (email: string, password: string) =>
    req<Tokens>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string) =>
    req<Tokens>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),
  account: () => req<AccountSummary>('/me/account'),
  ledger: () => req<LedgerEntry[]>('/me/ledger'),
  rewards: () => req<Reward[]>('/rewards'),
  redeem: (rewardCode: string) =>
    req<AccountSummary>('/me/redeem', { method: 'POST', body: JSON.stringify({ rewardCode }) }),
};
