import React, { useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import type { UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { authStage, login, verify2FA, resend2FA, reset2FA, setAuth } = useAuthStore();
  const { addToast } = useToastStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resending, setResending] = useState(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'CUSTOMER' as UserRole,
  });

  // Handle 60s countdown timer when in AWAITING_2FA stage
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (authStage === 'AWAITING_2FA' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authStage, resendCooldown]);

  // Focus first OTP cell upon entering 2FA stage
  useEffect(() => {
    if (authStage === 'AWAITING_2FA') {
      setOtpDigits(['', '', '', '', '', '']);
      setResendCooldown(60);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [authStage]);

  if (!isOpen) return null;

  const handleClose = () => {
    reset2FA();
    setError('');
    setLoading(false);
    onClose();
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'register') {
        const payload = {
          email: form.email.trim(),
          password: form.password,
          firstName: form.firstName.trim() || undefined,
          lastName: form.lastName.trim() || undefined,
          role: form.role,
        };
        const res = await apiClient.post('/auth/register', payload);
        const { user, tokens } = res.data;
        setAuth(user, tokens.accessToken, tokens.refreshToken);
        addToast('Account created successfully! 🎉', 'success');
        handleClose();
      } else {
        const res = await login(form.email.trim(), form.password);
        if (res.requires2FA) {
          addToast('Verification code sent to your email ✉️', 'info');
        } else {
          addToast('Welcome back! 👋', 'success');
          handleClose();
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (email: string, _role: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await login(email, 'Password123!');
      if (res.requires2FA) {
        addToast('Verification code sent to your email ✉️', 'info');
      } else {
        addToast(`Logged in as Demo ${_role}! 🚀`, 'success');
        handleClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Demo login failed. Please ensure DB is seeded.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // OTP Input handlers
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError('');

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setOtpDigits(newDigits);
    const lastFilledIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[lastFilledIndex]?.focus();
  };

  const handleVerify2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verify2FA(code);
      addToast('Identity verified successfully! Welcome back! 🎉', 'success');
      handleClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid verification code. Please try again.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError('');

    try {
      await resend2FA();
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
      addToast('A fresh verification code has been dispatched to your email.', 'info');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to resend code. Please try again.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="modal-content modal-auth" onClick={(e) => e.stopPropagation()}>
        {authStage === 'AWAITING_2FA' ? (
          /* =================== 2FA OTP SCREEN =================== */
          <>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Two-Factor Authentication</h2>
                <p className="modal-subtitle">Security verification required to complete sign-in</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <form onSubmit={handleVerify2FASubmit} className="otp-container">
                <div className="otp-icon-wrap">
                  ✉️
                </div>

                <p className="otp-instruction-text">
                  We've sent a 6-digit security code to your registered email address. Please enter it below within <strong>5 minutes</strong>.
                </p>

                <div className="otp-inputs-grid" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      id={`otp-cell-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`otp-digit-cell ${digit ? 'filled' : ''}`}
                      autoComplete="one-time-code"
                      disabled={loading}
                    />
                  ))}
                </div>

                {error && <div className="error-banner" style={{ width: '100%' }}>{error}</div>}

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading || otpDigits.join('').length !== 6}
                >
                  {loading ? 'Verifying Code…' : 'Verify & Continue'}
                </button>

                <div className="otp-footer-actions">
                  <div className="otp-resend-row">
                    <span>Didn't receive the code?</span>
                    <button
                      type="button"
                      className="btn-link-action"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || resending}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resending ? 'Sending…' : 'Resend code'}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn-back-login"
                    onClick={() => {
                      reset2FA();
                      setError('');
                    }}
                  >
                    ← Back to login
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          /* =================== EMAIL & PASSWORD / REGISTER SCREEN =================== */
          <>
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
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleClose}
                aria-label="Close"
              >
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

              <form onSubmit={handleAuthSubmit} className="auth-modal-form">
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
          </>
        )}
      </div>
    </div>
  );
}
