import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/ui/Button.jsx';
import Card from '../components/ui/Card.jsx';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else {
        await signUp(email, password);
        setError('Account created — check your email if confirmation is required, then log in.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy)' }}>Rachelle's System</h1>
          <p className="muted" style={{ fontSize: 12 }}>Personal operating system</p>
        </div>
        <form onSubmit={handleSubmit} className="stack">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Create account'}
          </Button>
        </form>
        <button className="btn-text" style={{ display: 'block', width: '100%', textAlign: 'center', marginTop: 14 }}
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Log in'}
        </button>
        {error && <p style={{ color: 'var(--accent)', fontSize: 12, textAlign: 'center', marginTop: 10 }}>{error}</p>}
      </Card>
    </div>
  );
}
