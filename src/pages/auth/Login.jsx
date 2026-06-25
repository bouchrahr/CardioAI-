import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CardiaLogo from '../../components/CardiaLogo';
import useAuthStore from '../../store/authStore';

const REDIRECTS = {
  admin:   '/admin/dashboard',
  doctor:  '/doctor/dashboard',
  patient: '/patient/dashboard',
};

const TEST_ACCOUNTS = [
  { role: 'Médecin', email: 'doctor@cardioai.com', pass: 'doctor123', color: '#4FC3F7' },
  { role: 'Patient', email: 'fatima@cardioai.com', pass: 'patient123', color: '#00E676' },
  { role: 'Admin',   email: 'admin@cardioai.com',  pass: 'admin123',   color: '#FFB300' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    const result = await login(email, password);
    if (result.success) navigate(REDIRECTS[result.role] ?? '/');
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          background: #070E1A;
          font-family: "Space Grotesk", ui-sans-serif, sans-serif;
          -webkit-font-smoothing: antialiased;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        /* Same background as landing */
        .login-bg {
          position: fixed; inset: 0; z-index: 0;
          background:
            radial-gradient(900px 600px at 78% 18%, rgba(30,136,229,0.18), transparent 60%),
            radial-gradient(600px 500px at 10% 90%, rgba(79,195,247,0.10), transparent 60%),
            linear-gradient(180deg, #050A14 0%, #070E1A 50%, #060C18 100%);
        }
        .login-grid {
          position: fixed; inset: 0; z-index: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 56px 56px;
          opacity: .5;
          pointer-events: none;
        }

        /* Glow behind card */
        .login-glow {
          position: absolute;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(30,136,229,0.12), transparent 70%);
          pointer-events: none;
          z-index: 1;
        }

        /* Card */
        .login-card {
          position: relative; z-index: 2;
          width: 100%; max-width: 440px;
          background: rgba(11, 20, 36, 0.85);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 40px 36px;
          backdrop-filter: blur(20px);
          box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          margin: 20px;
        }

        /* Top accent line */
        .login-card::before {
          content: '';
          position: absolute;
          top: 0; left: 20%; right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(79,195,247,0.5), transparent);
          border-radius: 1px;
        }

        /* Logo area */
        .login-logo { margin-bottom: 28px; }

        /* Headings */
        .login-title {
          font-size: 1.6rem; font-weight: 700;
          letter-spacing: -0.03em; color: #fff;
          margin-bottom: 6px; line-height: 1.1;
        }
        .login-sub {
          font-size: 0.85rem; color: rgba(255,255,255,0.38);
          margin-bottom: 28px; line-height: 1.5;
        }

        /* Error */
        .login-error {
          background: rgba(255,51,102,0.1);
          border: 1px solid rgba(255,51,102,0.25);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.82rem;
          color: #FF6B8A;
          margin-bottom: 18px;
          display: flex; align-items: center; gap: 8px;
        }

        /* Form */
        .form { display: flex; flex-direction: column; gap: 14px; }

        .field-label {
          font-size: 0.72rem; font-weight: 600;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.1em; text-transform: uppercase;
          margin-bottom: 6px;
          display: block;
        }

        .field-wrap { position: relative; }

        .field-icon {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          color: rgba(255,255,255,0.25);
          display: flex; align-items: center;
          pointer-events: none;
        }

        .field-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 12px;
          padding: 13px 14px 13px 42px;
          font-size: 0.9rem;
          font-family: "Space Grotesk", sans-serif;
          color: #fff;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder { color: rgba(255,255,255,0.2); }
        .field-input:focus {
          border-color: rgba(79,195,247,0.4);
          background: rgba(255,255,255,0.06);
          box-shadow: 0 0 0 3px rgba(79,195,247,0.08);
        }

        .eye-btn {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.25); padding: 4px;
          display: flex; align-items: center;
          transition: color 0.15s;
        }
        .eye-btn:hover { color: rgba(255,255,255,0.5); }

        /* Submit button */
        .submit-btn {
          width: 100%; margin-top: 4px;
          background: linear-gradient(180deg, #2196F3, #1565C0);
          border: none; border-radius: 12px;
          padding: 14px;
          font-size: 0.95rem; font-weight: 600;
          font-family: "Space Grotesk", sans-serif;
          color: #fff; cursor: pointer;
          box-shadow: 0 8px 24px rgba(30,136,229,0.35), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: transform 0.15s, box-shadow 0.2s, filter 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(30,136,229,0.5);
          filter: brightness(1.06);
        }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Spinner */
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Divider */
        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 20px 0 16px;
        }
        .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
        .divider-text { font-size: 0.7rem; color: rgba(255,255,255,0.25); letter-spacing: 0.1em; white-space: nowrap; }

        /* Test accounts */
        .test-accounts { display: flex; flex-direction: column; gap: 6px; }
        .test-account {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .test-account:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.12);
        }
        .test-role {
          font-size: 0.72rem; font-weight: 600;
          font-family: "JetBrains Mono", monospace;
          letter-spacing: 0.08em;
          min-width: 58px;
        }
        .test-email { font-size: 0.72rem; color: rgba(255,255,255,0.3); flex: 1; }
        .test-arrow { font-size: 0.7rem; color: rgba(255,255,255,0.2); }

        /* Back to landing */
        .back-link {
          display: flex; align-items: center; gap: 6px;
          margin-bottom: 24px;
          font-size: 0.78rem; color: rgba(255,255,255,0.3);
          cursor: pointer; width: fit-content;
          transition: color 0.15s;
          background: none; border: none; font-family: inherit;
        }
        .back-link:hover { color: rgba(255,255,255,0.6); }
      `}</style>

      <div className="login-root">
        <div className="login-bg" />
        <div className="login-grid" />
        <div className="login-glow" />

        <div className="login-card">

          {/* Back */}
          <button className="back-link" onClick={() => navigate('/')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Retour à l'accueil
          </button>

          {/* Logo */}
          <div className="login-logo">
            <CardiaLogo size="md" showTag={true} />
          </div>

          <div className="login-title">Connexion</div>
          <div className="login-sub">Accédez à votre espace médical sécurisé</div>

          {/* Error */}
          {error && (
            <div className="login-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form className="form" onSubmit={handleSubmit}>
            <div>
              <label className="field-label">Adresse e-mail</label>
              <div className="field-wrap">
                <span className="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M2 8l10 6 10-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </span>
                <input
                  type="email"
                  className="field-input"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="field-label">Mot de passe</label>
              <div className="field-wrap">
                <span className="field-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8"/>
                    <circle cx="12" cy="15.5" r="1.2" fill="currentColor"/>
                  </svg>
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="field-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className="eye-btn" onClick={() => setShowPass(!showPass)}>
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/></svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Se connecter <span>→</span></>}
            </button>
          </form>

          {/* Test accounts */}
          <div className="divider">
            <div className="divider-line" />
            <span className="divider-text">COMPTES DE TEST</span>
            <div className="divider-line" />
          </div>

          <div className="test-accounts">
            {TEST_ACCOUNTS.map((a) => (
              <div
                key={a.role}
                className="test-account"
                onClick={() => { setEmail(a.email); setPassword(a.pass); clearError(); }}
              >
                <span className="test-role" style={{ color: a.color }}>{a.role}</span>
                <span className="test-email">{a.email}</span>
                <span className="test-arrow">↗</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}