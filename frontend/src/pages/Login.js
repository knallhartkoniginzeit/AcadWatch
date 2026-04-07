import React, { useState } from 'react';
import './Login.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

const DEMO_CREDS = {
  admin:   { username: 'admin@school.edu',   password: 'admin123',   hint: 'Full system access, analytics dashboard' },
  faculty: { username: 'tla@school.edu',     password: 'TLA',        hint: 'Access for TLA subject. (Use ml@school.edu / ML for ML)' },
  student: { username: 'student01@school.edu',password: 'student01', hint: 'View marks, track habits, see suggestions (up to student68)' },
};

export default function Login({ onLogin }) {
  const [roleMode, setRoleMode] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: roleMode, username: username.trim(), password: password.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      onLogin(data);
    } catch (err) {
      setError(err.message || 'Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const switchRole = (r) => {
    setRoleMode(r);
    setError('');
    setUsername('');
    setPassword('');
  };

  const fillDemo = () => {
    const cred = DEMO_CREDS[roleMode];
    setUsername(cred.username);
    setPassword(cred.password);
  };

  const cred = DEMO_CREDS[roleMode];

  const roleIcons = { admin: '🛡️', faculty: '👩‍🏫', student: '🎓' };
  const roleColors = { admin: '#6366f1', faculty: '#0ea5e9', student: '#22c55e' };

  return (
    <div className="login-page fade-in">
      <div className="login-bg-decor">
        <div className="decor-circle decor-1" />
        <div className="decor-circle decor-2" />
        <div className="decor-circle decor-3" />
      </div>

      <div className="login-box card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">◈</div>
          <div>
            <div className="login-brand-name">AcadWatch</div>
            <div className="login-brand-tag">Student Performance Intelligence</div>
          </div>
        </div>

        <h2 className="login-title">Welcome back</h2>
        <p className="login-subtitle">Sign in to your portal to continue</p>

        {/* Role tabs */}
        <div className="login-tabs">
          {['admin', 'faculty', 'student'].map(r => (
            <button
              key={r}
              id={`role-tab-${r}`}
              className={`login-tab ${roleMode === r ? 'active' : ''}`}
              style={roleMode === r ? { borderColor: roleColors[r], color: roleColors[r] } : {}}
              onClick={() => switchRole(r)}
              type="button"
            >
              {roleIcons[r]} {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {/* Demo credentials hint */}
        <div className="demo-hint-box" style={{ borderColor: roleColors[roleMode] + '60', background: roleColors[roleMode] + '10' }}>
          <div className="demo-hint-top">
            <span className="demo-label" style={{ color: roleColors[roleMode] }}>Demo Credentials</span>
            <button
              type="button"
              className="demo-fill-btn"
              id="fill-demo-btn"
              onClick={fillDemo}
              style={{ color: roleColors[roleMode] }}
            >
              Auto-fill →
            </button>
          </div>
          <div className="demo-cred-row"><span className="demo-key">Username:</span><code className="demo-val">{cred.username}</code></div>
          <div className="demo-cred-row"><span className="demo-key">Password:</span><code className="demo-val">{cred.password}</code></div>
          <div className="demo-hint-desc">{cred.hint}</div>
        </div>

        {error && <div className="error-box" style={{ marginBottom: 16 }}>⚠ {error}</div>}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">
              {roleMode === 'student' ? 'Student Email / ID' : 'Email Address'}
            </label>
            <input
              id="login-username"
              type="text"
              className="input-field"
              placeholder={cred.username}
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              id="login-password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            id="login-submit-btn"
            className="btn btn-primary login-btn"
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            style={{ background: roleColors[roleMode] }}
          >
            {loading ? '⏳ Authenticating...' : `Sign in as ${roleMode.charAt(0).toUpperCase() + roleMode.slice(1)} →`}
          </button>
        </form>

        <div className="login-footer">
          Welcome to AcadWatch V2
        </div>
      </div>
    </div>
  );
}
