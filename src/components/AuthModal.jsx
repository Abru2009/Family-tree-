import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { Lock, Mail, User, Eye, EyeOff, ShieldCheck, LogIn, UserPlus, X } from 'lucide-react';

const AuthModal = ({ onClose, allowClose = false }) => {
  const { signIn, signUp, currentUser } = useAuth();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    try {
      setLoading(true);
      if (mode === 'signup') {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
      if (onClose) onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
      padding: '16px',
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: '420px',
        padding: '28px 24px',
        position: 'relative',
        borderRadius: '24px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        border: '1px solid rgba(69, 183, 174, 0.3)',
      }}>
        {/* Optional close button if user is already logged in */}
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

        {/* Header Badge */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(69, 183, 174, 0.15)',
            border: '1px solid rgba(69, 183, 174, 0.4)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent-color)', marginBottom: 10,
          }}>
            <Lock size={22} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {mode === 'signin'
              ? 'Sign in to access & manage your family tree'
              : 'Sign up to build your secure private family tree'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
          background: 'rgba(15, 23, 42, 0.25)',
          padding: 4, borderRadius: 12, marginBottom: 20,
        }}>
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(''); }}
            style={{
              padding: '8px', fontSize: '0.85rem', fontWeight: 700,
              borderRadius: 9, border: 'none', cursor: 'pointer',
              background: mode === 'signin' ? 'var(--accent-color)' : 'transparent',
              color: mode === 'signin' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            style={{
              padding: '8px', fontSize: '0.85rem', fontWeight: 700,
              borderRadius: 9, border: 'none', cursor: 'pointer',
              background: mode === 'signup' ? 'var(--accent-color)' : 'transparent',
              color: mode === 'signup' ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s ease',
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#f87171',
            borderRadius: 10, padding: '10px 12px',
            fontSize: '0.8rem', fontWeight: 600,
            marginBottom: 16, textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'signup' && (
            <div>
              <label className="label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Abru"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type="email"
                className="input"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: 36 }}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 36, paddingRight: 38 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: 10,
                  background: 'transparent', border: 'none',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="label">Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{ paddingLeft: 36 }}
                  required
                />
              </div>
            </div>
          )}

          {/* SHA-256 Hashing Security Notice */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.73rem', color: 'var(--text-secondary)',
            marginTop: 2, marginBottom: 4,
          }}>
            <ShieldCheck size={14} color="#45b7ae" />
            <span>Passwords are hashed with salted <strong>SHA-256</strong> & encrypted.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '11px',
              fontSize: '0.9rem', fontWeight: 700,
              borderRadius: 12, border: 'none',
              background: 'var(--accent-color)',
              color: 'white', cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(69, 183, 174, 0.35)',
              marginTop: 4,
            }}
          >
            {mode === 'signin' ? <LogIn size={18} /> : <UserPlus size={18} />}
            {loading
              ? 'Processing...'
              : mode === 'signin'
              ? 'Sign In to Family Tree'
              : 'Create My Account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
