// components/AuthModal.tsx
// ============================================
// Story Scribe sign-in / sign-up modal
// Matches the leather-bound book aesthetic
// No form tags — uses onClick/onChange handlers
// ============================================

import React, { useState } from 'react';
import { signIn, signUp, sendMagicLink, resetPassword } from '../services/authService';

type AuthView = 'signin' | 'signup' | 'magic' | 'reset' | 'check_email';

interface AuthModalProps {
  onSuccess: () => void;
  onDismiss?: () => void;
  allowDismiss?: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(196,151,59,0.25)',
  borderRadius: 6,
  padding: '11px 14px',
  color: 'rgba(245,236,215,0.9)',
  fontSize: 15,
  fontFamily: 'Georgia, serif',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  letterSpacing: '0.35em',
  color: 'rgba(196,151,59,0.6)',
  textTransform: 'uppercase',
  marginBottom: 6,
  fontFamily: 'system-ui, sans-serif',
};

const primaryBtn: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: 'linear-gradient(135deg, #C4973B 0%, #a07830 100%)',
  border: 'none',
  borderRadius: 6,
  color: '#0a0806',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: 'system-ui, sans-serif',
  transition: 'opacity 0.2s',
};

const ghostBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(196,151,59,0.7)',
  fontSize: 12,
  cursor: 'pointer',
  letterSpacing: '0.1em',
  fontFamily: 'system-ui, sans-serif',
  padding: '4px 0',
  textDecoration: 'underline',
};

export const AuthModal: React.FC<AuthModalProps> = ({
  onSuccess,
  onDismiss,
  allowDismiss = false,
}) => {
  const [view, setView] = useState<AuthView>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const clear = () => { setError(''); };

  const handleSignIn = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); clear();
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    onSuccess();
  };

  const handleSignUp = async () => {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); clear();
    const { error: err } = await signUp(email, password, displayName);
    setLoading(false);
    if (err) { setError(err); return; }
    setView('check_email');
  };

  const handleMagicLink = async () => {
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); clear();
    const { error: err } = await sendMagicLink(email);
    setLoading(false);
    if (err) { setError(err); return; }
    setView('check_email');
  };

  const handleReset = async () => {
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); clear();
    const { error: err } = await resetPassword(email);
    setLoading(false);
    if (err) { setError(err); return; }
    setView('check_email');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(8,6,4,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#100e0b',
        border: '1px solid rgba(196,151,59,0.2)',
        borderRadius: 12,
        padding: '40px 36px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        position: 'relative',
      }}>

        {/* Close */}
        {allowDismiss && onDismiss && (
          <button onClick={onDismiss} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none',
            color: 'rgba(245,236,215,0.3)', cursor: 'pointer', fontSize: 20,
          }}>✕</button>
        )}

        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            fontSize: 11, letterSpacing: '0.4em',
            color: 'rgba(196,151,59,0.5)', textTransform: 'uppercase',
            fontFamily: 'system-ui', marginBottom: 8,
          }}>Story Scribe</div>
          <div style={{
            fontFamily: 'Georgia, serif', fontSize: 22,
            color: 'rgba(245,236,215,0.9)', lineHeight: 1.3,
          }}>
            {view === 'signin' && 'Welcome back'}
            {view === 'signup' && 'Create your vault'}
            {view === 'magic' && 'Passwordless sign in'}
            {view === 'reset' && 'Reset your password'}
            {view === 'check_email' && 'Check your email'}
          </div>
        </div>

        {/* Check email confirmation */}
        {view === 'check_email' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✉️</div>
            <p style={{
              color: 'rgba(245,236,215,0.7)', fontFamily: 'Georgia, serif',
              fontSize: 15, lineHeight: 1.6, marginBottom: 24,
            }}>
              We sent a link to <strong style={{ color: 'rgba(196,151,59,0.9)' }}>{email}</strong>.
              Click it to access your stories.
            </p>
            <button style={ghostBtn} onClick={() => setView('signin')}>
              Back to sign in
            </button>
          </div>
        )}

        {/* Sign In */}
        {view === 'signin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              />
            </div>
            {error && <p style={{ color: '#e05252', fontSize: 13, fontFamily: 'system-ui', margin: 0 }}>{error}</p>}
            <button
              style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <button style={ghostBtn} onClick={() => { setView('signup'); clear(); }}>Create account</button>
              <button style={ghostBtn} onClick={() => { setView('reset'); clear(); }}>Forgot password?</button>
            </div>
            <div style={{ borderTop: '1px solid rgba(196,151,59,0.1)', paddingTop: 14, textAlign: 'center' }}>
              <button style={{ ...ghostBtn, fontSize: 11 }} onClick={() => { setView('magic'); clear(); }}>
                Sign in without a password →
              </button>
            </div>
          </div>
        )}

        {/* Sign Up */}
        {view === 'signup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Your name (optional)</label>
              <input
                style={inputStyle}
                type="text"
                value={displayName}
                placeholder="How Connie will know you"
                onChange={e => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                style={inputStyle}
                type="password"
                value={password}
                placeholder="At least 6 characters"
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSignUp()}
              />
            </div>
            {error && <p style={{ color: '#e05252', fontSize: 13, fontFamily: 'system-ui', margin: 0 }}>{error}</p>}
            <button
              style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}
              onClick={handleSignUp}
              disabled={loading}
            >
              {loading ? 'Creating vault…' : 'Create Account'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button style={ghostBtn} onClick={() => { setView('signin'); clear(); }}>Already have an account?</button>
            </div>
          </div>
        )}

        {/* Magic Link */}
        {view === 'magic' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <p style={{
              color: 'rgba(245,236,215,0.5)', fontFamily: 'Georgia, serif',
              fontSize: 14, lineHeight: 1.6, margin: 0,
            }}>
              Enter your email and we'll send you a sign-in link — no password needed.
            </p>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMagicLink()}
              />
            </div>
            {error && <p style={{ color: '#e05252', fontSize: 13, fontFamily: 'system-ui', margin: 0 }}>{error}</p>}
            <button
              style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}
              onClick={handleMagicLink}
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send Magic Link'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button style={ghostBtn} onClick={() => { setView('signin'); clear(); }}>Back to sign in</button>
            </div>
          </div>
        )}

        {/* Reset Password */}
        {view === 'reset' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={inputStyle}
                type="email"
                value={email}
                placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
              />
            </div>
            {error && <p style={{ color: '#e05252', fontSize: 13, fontFamily: 'system-ui', margin: 0 }}>{error}</p>}
            <button
              style={{ ...primaryBtn, opacity: loading ? 0.6 : 1 }}
              onClick={handleReset}
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
            <div style={{ textAlign: 'center' }}>
              <button style={ghostBtn} onClick={() => { setView('signin'); clear(); }}>Back to sign in</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AuthModal;
