import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck, LogIn, UserPlus, X, KeyRound, RotateCcw, CheckCircle } from 'lucide-react';
import { getStoredUsers, resetAccountPassword } from '../utils/cryptoAuth';

// ── Mode: 'signin' | 'signup' | 'recover'
const AuthModal = ({ onClose, allowClose = false }) => {
  const { signIn, signUp, currentUser, signInWithSession } = useAuth();
  const [mode, setMode] = useState('signin');

  // Shared fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery-specific state
  const [accounts, setAccounts] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [recoveryDone, setRecoveryDone] = useState(false);

  // Load stored accounts when entering recovery mode
  useEffect(() => {
    if (mode === 'recover') {
      const stored = getStoredUsers();
      setAccounts(stored);
      if (stored.length === 1) setSelectedUserId(stored[0].id);
    }
  }, [mode]);

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setRecoveryDone(false);
  };

  // ── Sign In / Sign Up submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Please fill in all required fields.'); return; }
    if (mode === 'signup') {
      if (!name.trim()) { setError('Please enter your full name.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    }
    try {
      setLoading(true);
      if (mode === 'signup') { await signUp(name, email, password); }
      else { await signIn(email, password); }
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally { setLoading(false); }
  };

  // ── Account Recovery submit ─────────────────────────────────────────────────
  const handleRecover = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedUserId) { setError('Please select an account to recover.'); return; }
    if (password.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    try {
      setLoading(true);
      const session = await resetAccountPassword({ userId: selectedUserId, newPassword: password });
      // Log in with the new session
      if (signInWithSession) signInWithSession(session);
      setRecoveryDone(true);
      setTimeout(() => { if (onClose) onClose(); }, 1800);
    } catch (err) {
      setError(err.message || 'Recovery failed. Please try again.');
    } finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px 10px 36px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(69,183,174,0.25)',
    borderRadius: 10, color: 'var(--text-primary)',
    fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 5, display: 'block', letterSpacing: '0.3px' };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '16px',
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: '440px',
        padding: '28px 24px',
        position: 'relative', borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
        border: '1px solid rgba(69,183,174,0.3)',
      }}>

        {/* Close button (only when already logged in) */}
        {allowClose && currentUser && (
          <button onClick={onClose} style={{
            position: 'absolute', top: 18, right: 18,
            background: 'rgba(69,183,174,0.1)', border: 'none',
            borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', cursor: 'pointer',
          }}>
            <X size={18} />
          </button>
        )}

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: mode === 'recover' ? 'rgba(251,191,36,0.15)' : 'rgba(69,183,174,0.15)',
            border: `1px solid ${mode === 'recover' ? 'rgba(251,191,36,0.4)' : 'rgba(69,183,174,0.4)'}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: mode === 'recover' ? '#fbbf24' : 'var(--accent-color)', marginBottom: 10,
          }}>
            {mode === 'recover' ? <KeyRound size={22} /> : <Lock size={22} />}
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Recover Account'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 5 }}>
            {mode === 'signin' && 'Sign in to access & manage your family tree'}
            {mode === 'signup' && 'Sign up to build your secure private family tree'}
            {mode === 'recover' && 'Select your account and set a new password. Your family tree data is safe.'}
          </p>
        </div>

        {/* ── Tab Switcher ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5,
          background: 'rgba(15,23,42,0.3)', padding: 4, borderRadius: 12, marginBottom: 20,
        }}>
          {[
            { key: 'signin', label: 'Sign In', icon: <LogIn size={12} /> },
            { key: 'signup', label: 'Sign Up', icon: <UserPlus size={12} /> },
            { key: 'recover', label: 'Recover', icon: <KeyRound size={12} /> },
          ].map(tab => (
            <button
              key={tab.key} type="button"
              onClick={() => switchMode(tab.key)}
              style={{
                padding: '7px 4px', fontSize: '0.78rem', fontWeight: 700,
                borderRadius: 9, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: mode === tab.key
                  ? tab.key === 'recover' ? '#fbbf24' : 'var(--accent-color)'
                  : 'transparent',
                color: mode === tab.key ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
            color: '#f87171', borderRadius: 10, padding: '10px 12px',
            fontSize: '0.8rem', fontWeight: 600, marginBottom: 16, textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* ── SUCCESS STATE (recovery done) ── */}
        {recoveryDone && (
          <div style={{
            textAlign: 'center', padding: '24px 0',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          }}>
            <CheckCircle size={48} color="#50c88c" />
            <p style={{ color: '#50c88c', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
              Password reset! Signing you in…
            </p>
          </div>
        )}

        {/* ── RECOVERY FORM ── */}
        {mode === 'recover' && !recoveryDone && (
          <form onSubmit={handleRecover} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {accounts.length === 0 ? (
              <div style={{
                background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                borderRadius: 12, padding: '16px', textAlign: 'center',
                color: 'rgba(251,191,36,0.9)', fontSize: '0.84rem',
              }}>
                ⚠️ No accounts found in this browser.<br />
                <span style={{ fontSize: '0.76rem', opacity: 0.8 }}>
                  Please Sign Up to create a new account.
                </span>
              </div>
            ) : (
              <>
                {/* Account picker */}
                <div>
                  <label style={labelStyle}>Select Your Account</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {accounts.map(acc => (
                      <button
                        key={acc.id} type="button"
                        onClick={() => setSelectedUserId(acc.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                          background: selectedUserId === acc.id ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                          border: `2px solid ${selectedUserId === acc.id ? '#fbbf24' : 'rgba(255,255,255,0.08)'}`,
                          textAlign: 'left', transition: 'all 0.15s',
                        }}
                      >
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                          background: 'rgba(251,191,36,0.15)',
                          border: '1px solid rgba(251,191,36,0.4)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <User size={16} color="#fbbf24" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                            {acc.name}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                            {acc.email}
                          </div>
                        </div>
                        {selectedUserId === acc.id && (
                          <CheckCircle size={16} color="#fbbf24" style={{ marginLeft: 'auto' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label style={labelStyle}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      style={inputStyle}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      style={{ position: 'absolute', right: 10, top: 10, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm new password */}
                <div>
                  <label style={labelStyle}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      style={inputStyle}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  <ShieldCheck size={13} color="#fbbf24" />
                  <span>Your family tree data is fully preserved. Only the password changes.</span>
                </div>

                <button type="submit" disabled={loading || !selectedUserId} style={{
                  padding: '11px', fontSize: '0.9rem', fontWeight: 700,
                  borderRadius: 12, border: 'none',
                  background: '#fbbf24', color: '#1a1a1a',
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 4px 14px rgba(251,191,36,0.35)',
                  opacity: (!selectedUserId || loading) ? 0.6 : 1,
                  marginTop: 4,
                }}>
                  <RotateCcw size={17} />
                  {loading ? 'Resetting…' : 'Reset Password & Sign In'}
                </button>
              </>
            )}
          </form>
        )}

        {/* ── SIGN IN / SIGN UP FORM ── */}
        {(mode === 'signin' || mode === 'signup') && !recoveryDone && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input type="text" style={inputStyle} placeholder="e.g. Abru" value={name} onChange={e => setName(e.target.value)} required />
                </div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input type="email" style={inputStyle} placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={inputStyle}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: 'absolute', right: 10, top: 10, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input type={showPassword ? 'text' : 'password'} style={inputStyle} placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              <ShieldCheck size={14} color="#45b7ae" />
              <span>Passwords are hashed with salted <strong>SHA-256</strong> &amp; encrypted.</span>
            </div>

            {/* Forgot password hint */}
            {mode === 'signin' && (
              <button type="button" onClick={() => switchMode('recover')} style={{
                background: 'none', border: 'none', color: '#fbbf24',
                fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', textAlign: 'right',
                padding: 0, marginTop: -8,
              }}>
                🔑 Forgot your password? Recover account →
              </button>
            )}

            <button type="submit" disabled={loading} style={{
              padding: '11px', fontSize: '0.9rem', fontWeight: 700,
              borderRadius: 12, border: 'none',
              background: 'var(--accent-color)', color: 'white',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(69,183,174,0.35)', marginTop: 4,
            }}>
              {mode === 'signin' ? <LogIn size={18} /> : <UserPlus size={18} />}
              {loading ? 'Processing…' : mode === 'signin' ? 'Sign In to Family Tree' : 'Create My Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
