import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell
} from 'recharts';
import './Dashboard.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="ct-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="ct-row" style={{ color: p.color }}>
          <span>{p.name}</span><span>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [subStats, setSubStats] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [seeding, setSeeding]   = useState(false);

  const load = useCallback(async () => {
    try {
      const [dashRes, subRes] = await Promise.all([
        fetch(`${API}/dashboard`).then(r => r.json()),
        user.role === 'admin' ? fetch(`${API}/subject-stats`).then(r => r.json()) : Promise.resolve([]),
      ]);
      setData(dashRes);
      setSubStats(Array.isArray(subRes) ? subRes : []);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    setSeeding(true);
    try {
      await fetch(`${API}/seed-bulk`, { method: 'POST' });
      await load();
    } finally {
      setSeeding(false);
    }
  };

  if (loading) return (
    <div className="dash-loading">
      <div className="spinner spinner-dark" style={{ width: 24, height: 24 }} />
      <span>Loading dashboard...</span>
    </div>
  );

  if (!data || data.total === 0) return (
    <div className="dash-empty fade-in">
      <div className="empty-icon">◈</div>
      <h2>No student data yet</h2>
      {user?.role === 'admin' ? (
        <>
          <p>Seed demo data to explore the dashboard, or add students manually.</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button className="btn btn-primary" id="seed-bulk-btn" onClick={seed} disabled={seeding}>
              {seeding ? <><span className="spinner" />Seeding 68 students...</> : '▶ Load Bulk Demo Data'}
            </button>
          </div>
        </>
      ) : (
        <p>Waiting for administrator to initialize student records.</p>
      )}
    </div>
  );

  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header fade-in">
        <div>
          <h1 className="page-title">
            {user?.role === 'admin' ? '🛡️ Admin Dashboard' : '👩‍🏫 Faculty Dashboard'}
          </h1>
          <p className="page-subtitle">
            {user?.role === 'faculty'
              ? `Handling: ${(user.assigned_subjects || []).join(', ')}`
              : 'Institutional overview — all subjects'}
            &nbsp;· {today} · {data.total} students tracked
          </p>
        </div>
        <div className="dash-actions">
          <button className="btn btn-ghost" id="refresh-dashboard-btn" onClick={load}>↻ Refresh</button>
          {user?.role === 'faculty' && (
            <>
              <button className="btn btn-ghost" onClick={() => navigate('/my-students')}>My Students</button>
              <button className="btn btn-accent" id="enter-marks-btn" onClick={() => navigate('/marks')}>＋ Enter Marks</button>
            </>
          )}
          {user?.role === 'admin' && (
            <button className="btn btn-accent" onClick={() => navigate('/peer-groups')}>👥 Peer Groups</button>
          )}
        </div>
      </div>

      {/* At-Risk Alert Banner — shown to faculty */}
      {user?.role === 'faculty' && data.today_at_risk.length > 0 && (
        <div className="faculty-alert-banner fade-in">
          <div className="fab-icon">⚠</div>
          <div className="fab-body">
            <strong>{data.today_at_risk.length} student{data.today_at_risk.length > 1 ? 's are' : ' is'} currently at risk</strong>
            <span className="fab-names">
              {data.today_at_risk.slice(0, 4).map(s => s.name).join(', ')}
              {data.today_at_risk.length > 4 ? ` +${data.today_at_risk.length - 4} more` : ''}
            </span>
          </div>
          <button className="btn btn-danger" style={{ fontSize: 12, padding: '6px 14px', flexShrink: 0 }}
            onClick={() => navigate('/my-students')}>
            View Students →
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-row fade-in-1">
        <div className="kpi-card kpi-danger">
          <div className="kpi-top"><span className="kpi-icon">⚠</span><span className="kpi-delta">{data.risk_rate}%</span></div>
          <div className="kpi-value">{data.at_risk}</div>
          <div className="kpi-label">At-Risk Students</div>
        </div>
        <div className="kpi-card kpi-success">
          <div className="kpi-top"><span className="kpi-icon">✓</span></div>
          <div className="kpi-value">{data.passing}</div>
          <div className="kpi-label">On Track</div>
        </div>
        <div className="kpi-card kpi-accent">
          <div className="kpi-top"><span className="kpi-icon">📅</span></div>
          <div className="kpi-value">{data.avg_attendance}%</div>
          <div className="kpi-label">Avg Attendance</div>
        </div>
        <div className="kpi-card kpi-warning">
          <div className="kpi-top"><span className="kpi-icon">📋</span></div>
          <div className="kpi-value">{data.pending_recs}</div>
          <div className="kpi-label">Pending Recs</div>
        </div>
        <div className="kpi-card kpi-neutral">
          <div className="kpi-top"><span className="kpi-icon">↓</span></div>
          <div className="kpi-value">{data.worsened_today.length}</div>
          <div className="kpi-label">Worsened Today</div>
        </div>
      </div>

      {/* Worsened Alert */}
      {data.worsened_today.length > 0 && (
        <div className="alert-banner fade-in-1">
          <div className="alert-header">
            <span className="alert-dot" />
            <strong>⚠ {data.worsened_today.length} student{data.worsened_today.length > 1 ? 's' : ''} moved to At-Risk today</strong>
          </div>
          <div className="alert-list">
            {data.worsened_today.map(s => (
              <div key={s.student_id} className="alert-item">
                <div className="alert-avatar">{s.name.split(' ').map(n => n[0]).join('')}</div>
                <div>
                  <div className="alert-name">{s.name}</div>
                  <div className="alert-detail">Attendance: {s.attendance_percentage}% · Risk Score: {s.risk_score}/100</div>
                </div>
                <button className="btn btn-danger" style={{ padding: '5px 12px', fontSize: 12 }}
                  onClick={() => navigate('/recommendations')}>
                  View Recs
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="dash-grid fade-in-2">
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title">Attendance Trend (7 days)</h3>
          </div>
          {data.attendance_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.attendance_trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text3)' }} tickFormatter={d => d.slice(5)} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avg_attendance" name="Avg Attendance %"
                  stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No trend data yet — add daily updates to see trends</div>
          )}
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title">At-Risk Count Trend</h3>
          </div>
          {data.risk_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.risk_trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text3)' }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="at_risk_count" name="At Risk" radius={[4, 4, 0, 0]}>
                  {data.risk_trend.map((e, i) => (
                    <Cell key={i} fill={e.at_risk_count > 2 ? '#dc2626' : '#f87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No trend data yet</div>
          )}
        </div>
      </div>

      {/* Admin: Subject-wise Performance Chart */}
      {user?.role === 'admin' && subStats.length > 0 && subStats.some(s => s.total > 0) && (
        <div className="card fade-in-2">
          <div className="card-header">
            <h3 className="card-title">
              <span className="section-dot" style={{ background: '#6366f1' }} />
              Subject-wise Performance Analytics
            </h3>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => navigate('/peer-groups')}>
              View Peer Groups →
            </button>
          </div>
          <div className="substat-grid">
            {subStats.filter(s => s.total > 0).map(s => (
              <div key={s.subject} className="substat-card">
                <div className="substat-subject">{s.subject}</div>
                <div className="substat-bar-wrap">
                  <div className="substat-bar-bg">
                    <div
                      className="substat-bar-fill"
                      style={{
                        width: `${s.avg_mark}%`,
                        background: s.avg_mark >= 65 ? '#22c55e' : s.avg_mark >= 50 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                  <span className="substat-avg">{s.avg_mark}</span>
                </div>
                <div className="substat-meta">
                  <span className="substat-danger">{s.at_risk_count} at risk</span>
                  <span className="substat-pass">{s.pass_count} passing</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-Risk Students Table */}
      <div className="card fade-in-2">
        <div className="card-header">
          <h3 className="card-title">
            <span className="section-dot danger-dot" />
            At-Risk Students ({data.today_at_risk.length})
          </h3>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}
            onClick={() => navigate(user.role === 'faculty' ? '/my-students' : '/students')}>
            View All Students →
          </button>
        </div>
        {data.today_at_risk.length === 0 ? (
          <div className="empty-state">
            <span style={{ fontSize: 32 }}>🌟</span>
            <p>No at-risk students today. Great job!</p>
          </div>
        ) : (
          <div className="at-risk-table">
            <div className="table-head">
              <span>Student</span><span>Section</span><span>Attendance</span>
              <span>Risk Score</span><span>Status</span><span>Action</span>
            </div>
            {data.today_at_risk.map((s, i) => (
              <div key={s.student_id} className="table-row-item" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="student-cell">
                  <div className="student-av danger-av">{s.name.split(' ').map(n => n[0]).join('')}</div>
                  <div>
                    <div className="student-nm">{s.name}</div>
                    <div className="student-id">{s.student_id}</div>
                  </div>
                </div>
                <span className="cell-text">{s.section || '—'}</span>
                <span className={`cell-text ${s.attendance_percentage < 75 ? 'text-danger' : s.attendance_percentage < 85 ? 'text-warning' : ''}`}>
                  {s.attendance_percentage}%
                </span>
                <div className="score-cell">
                  <div className="score-bar-bg">
                    <div className="score-bar-fill danger-bar" style={{ width: `${Math.min(s.risk_score || 0, 100)}%` }} />
                  </div>
                  <span className="score-num">{s.risk_score}</span>
                </div>
                <span className={`badge ${s.risk_label === 'High Risk' || s.risk_label === 'At Risk' ? 'badge-danger' : s.risk_label === 'Mid Risk' ? 'badge-warning' : 'badge-success'}`}>
                  {s.risk_label}
                </span>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}
                  onClick={() => navigate(user.role === 'faculty' ? '/my-students' : '/students')}>
                  View →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending Recs Snapshot */}
      {data.pending_recs > 0 && (
        <div className="card rec-snapshot fade-in-3">
          <div className="card-header">
            <h3 className="card-title">
              <span className="section-dot warning-dot" />
              Pending Recommendations ({data.pending_recs})
            </h3>
            <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}
              onClick={() => navigate('/recommendations')}>
              Manage All →
            </button>
          </div>
          <p className="rec-hint">
            {data.pending_recs} recommendation action{data.pending_recs > 1 ? 's are' : ' is'} waiting to be marked complete.
            Visit the Recommendations page to track and update their status.
          </p>
        </div>
      )}
    </div>
  );
}
