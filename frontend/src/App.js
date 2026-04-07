import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import Dashboard      from './pages/Dashboard';
import Students       from './pages/Students';
import AddStudent     from './pages/AddStudent';
import Recommendations from './pages/Recommendations';
import Results        from './pages/Results';
import Login          from './pages/Login';
import HabitTracker   from './pages/HabitTracker';
import FacultyStudents from './pages/FacultyStudents';
import PeerGroups     from './pages/PeerGroups';
import './App.css';

const NAV = [
  { to:'/',                 label:'Dashboard',      icon:'▦',  exact:true, roles:['admin', 'faculty'] },
  { to:'/students',         label:'All Students',   icon:'◉',             roles:['admin'] },
  { to:'/my-students',     label:'My Students',    icon:'👥',             roles:['faculty'] },
  { to:'/marks',            label:'Manage Marks',   icon:'✎',             roles:['faculty'] },
  { to:'/peer-groups',      label:'Peer Groups',    icon:'🤝',             roles:['admin', 'faculty', 'student'] },
  { to:'/recommendations',  label:'Recommendations',icon:'📋',             roles:['admin', 'faculty'] },
  // Student nav
  { to:'/my-marks',         label:'My Performance', icon:'📊',             roles:['student'] },
  { to:'/habits',           label:'Habit Tracker',  icon:'🌱',             roles:['student'] },
  { to:'/recommendations',  label:'My Suggestions', icon:'💡',             roles:['student'] },
];

function Sidebar({ user, onLogout }) {
  const allowedNav = NAV.filter(n => n.roles.includes(user?.role));
  const roleMeta = {
    admin:   { label: 'Administrator', icon: '🛡️', color: '#6366f1' },
    faculty: { label: 'Faculty',       icon: '👩‍🏫', color: '#0ea5e9' },
    student: { label: 'Student',       icon: '🎓', color: '#22c55e' },
  };
  const rm = roleMeta[user?.role] || {};

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <span className="brand-icon">◈</span>
          <div>
            <div className="brand-name">AcadWatch</div>
            <div className="brand-tag">Academic Intelligence</div>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">NAVIGATION</div>
        {allowedNav.map(n => (
          <NavLink
            key={n.to + n.label}
            to={n.to}
            end={n.exact}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="link-icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="excel-badge" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 20 }}>{rm.icon}</span>
          <div>
            <div className="excel-label">Logged in as</div>
            <div className="excel-name" style={{ textTransform: 'capitalize', color: rm.color }}>
              {rm.label}
              {user?.student_id ? ` · ${user.student_id}` : ''}
            </div>
            <div className="excel-label" style={{ marginTop: 2 }}>{user?.username}</div>
          </div>
        </div>
        <button className="btn btn-ghost" style={{ width: '100%', textAlign: 'left' }} onClick={onLogout}>
          ← Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  const handleLogin = (u) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="app-content">
          <div className="top-bar">
            <div className="top-date">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="top-bar-right">
              {user.role === 'student' && (
                <span className="top-id-badge">{user.student_id}</span>
              )}
            </div>
          </div>
          <main className="main-content">
            <Routes>
              {/* Admin routes */}
              {user.role === 'admin' && (
                <>
                  <Route path="/"               element={<Dashboard user={user} />} />
                  <Route path="/students"       element={<Students user={user} />} />
                  <Route path="/peer-groups"    element={<PeerGroups user={user} />} />
                  <Route path="/recommendations" element={<Recommendations user={user} />} />
                  <Route path="*"               element={<Navigate to="/" replace />} />
                </>
              )}
              {/* Faculty routes */}
              {user.role === 'faculty' && (
                <>
                  <Route path="/"               element={<Dashboard user={user} />} />
                  <Route path="/my-students"    element={<FacultyStudents user={user} />} />
                  <Route path="/marks"          element={<AddStudent user={user} />} />
                  <Route path="/peer-groups"    element={<PeerGroups user={user} />} />
                  <Route path="/recommendations" element={<Recommendations user={user} />} />
                  <Route path="*"               element={<Navigate to="/" replace />} />
                </>
              )}
              {/* Student routes */}
              {user.role === 'student' && (
                <>
                  <Route path="/my-marks"       element={<Results user={user} />} />
                  <Route path="/habits"         element={<HabitTracker user={user} />} />
                  <Route path="/peer-groups"    element={<PeerGroups user={user} />} />
                  <Route path="/recommendations" element={<Recommendations user={user} />} />
                  <Route path="*"               element={<Navigate to="/my-marks" replace />} />
                </>
              )}
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
