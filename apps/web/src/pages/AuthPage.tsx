import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState<boolean>(false);

  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register({ email, name, password });
      } else {
        await login({ email, password });
      }
    } catch {
      // Toast already shows error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setIsSubmitting(true);
    try {
      await login({ email: demoEmail, password: 'password123' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          padding: 36,
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              marginBottom: 12,
            }}
          >
            <Layers size={28} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            TaskForge
          </h2>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {isRegister
              ? 'Create a new account to join the autonomous workspace'
              : 'Sign in to orchestrate projects and workflows'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                placeholder="Sarah Connor"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              placeholder="name@taskforge.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px 0', marginTop: 8 }}
          >
            {isSubmitting ? (
              'Processing...'
            ) : (
              <>
                {isRegister ? 'Create Account' : 'Sign In'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginBottom: 24 }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </div>

        {/* Demo Fast Login Buttons */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', marginBottom: 12 }}>
            Instant 1-Click Demo Profiles
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@taskforge.dev')}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', padding: '8px 12px' }}
            >
              <ShieldCheck size={16} color="#4f46e5" />
              <span>
                <strong>Sarah Connor</strong> (Lead Architect - Admin)
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('alex@taskforge.dev')}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', padding: '8px 12px' }}
            >
              <UserCheck size={16} color="#0284c7" />
              <span>
                <strong>Alex Chen</strong> (Senior Full-Stack Engineer)
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('elena@taskforge.dev')}
              className="btn btn-secondary btn-sm"
              style={{ justifyContent: 'flex-start', padding: '8px 12px' }}
            >
              <UserCheck size={16} color="#16a34a" />
              <span>
                <strong>Elena Rostova</strong> (Product Manager)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
