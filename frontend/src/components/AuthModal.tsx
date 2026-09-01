import { useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authstore';
import { useToastStore } from '../store/toastStore';
import type { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { setAuth } = useAuthStore();
  const { addToast } = useToastStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'CUSTOMER' as UserRole,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const payload =
        mode === 'register'
          ? {
            email: form.email.trim(),
            password: form.password,
            firstName: form.firstName.trim() || undefined,
            lastName: form.lastName.trim() || undefined,
            role: form.role,
          }
          : {
            email: form.email.trim(),
            password: form.password,
          };

      const res = await apiClient.post(endpoint, payload);
      const { user, tokens } = res.data;

      setAuth(user, tokens.accessToken, tokens.refreshToken);
      addToast(mode === 'register' ? 'Account created successfully! 🎉' : 'Welcome back! 👋', 'success');
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (email: string, role: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/auth/login', {
        email,
        password: 'Password123!',
      });
      const { user, tokens } = res.data;
      setAuth(user, tokens.accessToken, tokens.refreshToken);
      addToast(`Logged in as Demo ${role}! 🚀`, 'success');
      onClose();
    } catch (err: any) {
      setError(`Demo login failed. Ensure database is seeded.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-auth" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {mode === 'login' ? 'Welcome to OrderFlow' : 'Join OrderFlow'}
            </h2>
            <p className="modal-subtitle">
              {mode === 'login'
                ? 'Sign in to order food, track deliveries, or manage your restaurant'
                : 'Create an account to begin placing and managing food orders'}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="auth-tab-switch">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Create Account
          </button>
        </div>

        <div className="modal-body">
          {/* Quick Demo Login Badges */}
          <div className="demo-accounts-box">
            <span className="demo-box-label">⚡ 1-Click Quick Demo Login</span>
            <div className="demo-buttons-grid">
              <button
                type="button"
                className="btn-demo-pill"
                onClick={() => handleQuickDemoLogin('customer@orderflow.com', 'Customer')}
                disabled={loading}
              >
                👤 Customer
              </button>
              <button
                type="button"
                className="btn-demo-pill"
                onClick={() => handleQuickDemoLogin('owner@orderflow.com', 'Restaurant Owner')}
                disabled={loading}
              >
                👨‍🍳 Restaurant Owner
              </button>
              <button
                type="button"
                className="btn-demo-pill"
                onClick={() => handleQuickDemoLogin('admin@orderflow.com', 'Admin')}
                disabled={loading}
              >
                🛡️ Admin
              </button>
            </div>
          </div>

          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-modal-form">
            {mode === 'register' && (
              <div className="form-row-dual">
                <div className="field">
                  <label htmlFor="authFirstName">First Name</label>
                  <input
                    id="authFirstName"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    placeholder="Alex"
                  />
                </div>
                <div className="field">
                  <label htmlFor="authLastName">Last Name</label>
                  <input
                    id="authLastName"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    placeholder="Smith"
                  />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="authEmail">Email Address *</label>
              <input
                id="authEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your.email@example.com"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="authPassword">Password *</label>
              <input
                id="authPassword"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                minLength={8}
                required
              />
            </div>

            {mode === 'register' && (
              <div className="field">
                <label htmlFor="authRole">Account Type</label>
                <select
                  id="authRole"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                >
                  <option value="CUSTOMER">Customer (Order & eat delicious food)</option>
                  <option value="RESTAURANT_OWNER">Restaurant Owner (Manage menus & incoming orders)</option>
                  <option value="ADMIN">System Admin</option>
                </select>
              </div>
            )}

            {error && <div className="error-banner">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In to Account' : 'Create My Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
