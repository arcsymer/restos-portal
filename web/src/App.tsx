import { useCallback, useEffect, useState } from 'react';
import {
  AccountSummary,
  LedgerEntry,
  Reward,
  api,
  setAccess,
} from './api';

const TIER_LABEL: Record<AccountSummary['tier'], string> = {
  nowicjusz: 'Nowicjusz',
  staly: 'Stały',
  klub: 'Klub',
};

function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('anna@example.com');
  const [password, setPassword] = useState('password123');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const tokens = await (mode === 'login'
        ? api.login(email, password)
        : api.register(email, password));
      setAccess(tokens.accessToken);
      onLogin();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card login" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={busy}>
        {busy ? '…' : mode === 'login' ? 'Sign in' : 'Register'}
      </button>
      <button
        type="button"
        className="link"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
      </button>
      <p className="hint">Demo: anna@example.com · staff@example.com — password123</p>
    </form>
  );
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    const [a, l, r] = await Promise.all([api.account(), api.ledger(), api.rewards()]);
    setAccount(a);
    setLedger(l);
    setRewards(r);
  }, []);

  useEffect(() => {
    refresh().catch((e) => setMsg(String(e)));
  }, [refresh]);

  const redeem = async (code: string, name: string) => {
    setMsg('');
    try {
      await api.redeem(code);
      setMsg(`Redeemed: ${name} 🎉`);
      await refresh();
    } catch (e) {
      setMsg(String(e instanceof Error ? e.message : e));
    }
  };

  if (!account) {
    return <p className="card">Loading…</p>;
  }

  return (
    <div className="dash">
      <section className="card summary">
        <div className="balance">
          <span className="num">{account.balance}</span>
          <span className="label">points</span>
        </div>
        <div className="meta">
          <div>
            Tier: <strong>{TIER_LABEL[account.tier]}</strong>
          </div>
          <div className="muted">lifetime {account.lifetimePoints} pts</div>
        </div>
        <button className="link" onClick={onLogout}>
          Sign out
        </button>
      </section>

      {msg && <p className="notice">{msg}</p>}

      <section className="card">
        <h3>Rewards</h3>
        <ul className="rewards">
          {rewards.map((r) => {
            const affordable = account.balance >= r.costPoints;
            return (
              <li key={r.id}>
                <span>{r.name}</span>
                <span className="cost">{r.costPoints} pts</span>
                <button
                  className="btn small"
                  disabled={!affordable}
                  onClick={() => redeem(r.code, r.name)}
                >
                  {affordable ? 'Redeem' : 'Need more'}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h3>History</h3>
        <ul className="ledger">
          {ledger.length === 0 && <li className="muted">No activity yet.</li>}
          {ledger.map((e) => (
            <li key={e.id}>
              <span className={`kind ${e.kind.toLowerCase()}`}>{e.kind}</span>
              <span className="reason">{e.reason}</span>
              <span className={`pts ${e.points < 0 ? 'neg' : 'pos'}`}>
                {e.points > 0 ? '+' : ''}
                {e.points}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);

  return (
    <>
      <header>
        <h1>Bar Mleczny Nowa</h1>
        <span className="sub">loyalty &amp; rewards</span>
      </header>
      <main>
        {authed ? (
          <Dashboard onLogout={() => setAuthed(false)} />
        ) : (
          <Login onLogin={() => setAuthed(true)} />
        )}
      </main>
    </>
  );
}
