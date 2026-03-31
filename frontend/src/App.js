import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import AddStudent from './pages/AddStudent';
import Recommendations from './pages/Recommendations';
import Results from './pages/Results';
import Login from './pages/Login';
import './App.css';

const NAV = [
  { to:'/',            label:'Dashboard',       icon:'▦',  exact:true, roles:['teacher'] },
  { to:'/students',    label:'Students',         icon:'◉',             roles:['teacher'] },
  { to:'/add',         label:'Add / Update',     icon:'＋',            roles:['teacher','student'] },
  { to:'/recommendations', label:'Recommendations', icon:'📋',         roles:['teacher'] },
];

function Sidebar({ user, onLogout }) {
  const loc = useLocation();
  const allowedNav = NAV.filter(n => n.roles.includes(user?.role));
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
            key={n.to}
            to={n.to}
            end={n.exact}
            className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="link-icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="excel-badge" style={{marginBottom:10}}>
          <span>👤</span>
          <div>
            <div className="excel-label">Logged in as</div>
            <div className="excel-name" style={{textTransform:'capitalize'}}>
              {user?.role} {user?.student_id ? `(${user.student_id})` : ''}
            </div>
          </div>
        </div>
        <button className="btn btn-ghost" style={{width:'100%',textAlign:'left'}} onClick={onLogout}>
          ← Logout
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar user={user} onLogout={() => setUser(null)} />
        <div className="app-content">
          <div className="top-bar">
            <div className="top-date">
              {new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
            </div>
          </div>
          <main className="main-content">
            <Routes>
              {user.role === 'teacher' && (
                <>
                  <Route path="/"               element={<Dashboard />} />
                  <Route path="/students"       element={<Students />} />
                  <Route path="/recommendations" element={<Recommendations />} />
                </>
              )}
              {user.role === 'student' && (
                <Route path="/" element={<Navigate to="/add" replace />} />
              )}
              <Route path="/add"            element={<AddStudent user={user} />} />
              <Route path="/results"        element={<Results />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
