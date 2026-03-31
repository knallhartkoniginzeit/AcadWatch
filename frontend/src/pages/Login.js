import React, { useState } from 'react';
import './Login.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

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
        body: JSON.stringify({
          role: roleMode,
          username: username.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // Success
      if (roleMode === 'student') {
        onLogin({ role: 'student', student_id: data.student_id });
      } else {
        onLogin({ role: 'teacher', username: username });
      }
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

  return (
    <div className="login-page fade-in">
      <div className="login-box card">
        <div className="login-header">
          <div className="brand-logo" style={{justifyContent: 'center', marginBottom: 20}}>
            <span className="brand-icon">◈</span>
            <div style={{textAlign: 'left'}}>
              <div className="brand-name" style={{color: 'var(--navy)'}}>AcadWatch</div>
              <div className="brand-tag">Academic Intelligence</div>
            </div>
          </div>
          <h2 className="login-title">Sign In</h2>
        </div>

        <div className="login-tabs">
          <button 
            className={`login-tab ${roleMode === 'student' ? 'active' : ''}`}
            onClick={() => switchRole('student')}
            type="button"
          >
            🎓 Student
          </button>
          <button 
            className={`login-tab ${roleMode === 'teacher' ? 'active' : ''}`}
            onClick={() => switchRole('teacher')}
            type="button"
          >
            👩‍🏫 Teacher
          </button>
        </div>

        {error && <div className="error-box" style={{marginBottom: 20}}>⚠ {error}</div>}

        <form className="login-form fade-in-1" onSubmit={handleLogin}>
          
          <div className="input-group">
            <label className="input-label">
              {roleMode === 'student' ? 'Student ID' : 'Username'}
            </label>
            <input 
              type="text" 
              className="input-field" 
              placeholder={roleMode === 'student' ? "e.g. CS21001" : "admin"} 
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
            />
            {roleMode === 'student' && (
              <div style={{fontSize: 11, color: 'var(--text2)', marginTop: 4}}>Demo Password: student123</div>
            )}
            {roleMode === 'teacher' && (
              <div style={{fontSize: 11, color: 'var(--text2)', marginTop: 4}}>Demo: admin / admin123</div>
            )}
          </div>

          <button 
            className="btn btn-primary login-btn" 
            type="submit" 
            disabled={loading || !username.trim() || !password.trim()}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
          
        </form>
      </div>
    </div>
  );
}
