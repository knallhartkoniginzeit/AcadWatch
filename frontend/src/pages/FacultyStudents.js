import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './FacultyStudents.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

const RISK_LEVELS = {
  high:   { label: 'High Risk',  color: '#dc2626', bg: '#fef2f2', badge: 'badge-danger' },
  medium: { label: 'Medium Risk',color: '#d97706', bg: '#fffbeb', badge: 'badge-warning' },
  low:    { label: 'Low Risk',   color: '#059669', bg: '#ecfdf5', badge: 'badge-success' },
};

function getRiskLevel(riskScore) {
  if (riskScore >= 60) return 'high';
  if (riskScore >= 35) return 'medium';
  return 'low';
}

function MLBadge({ label, prob, name }) {
  const isAtRisk = label === 'At Risk';
  return (
    <div className="ml-badge-item">
      <div className="ml-model-name">{name}</div>
      <span className={`ml-badge ${isAtRisk ? 'ml-at-risk' : 'ml-pass'}`}>
        {isAtRisk ? '⚠ At Risk' : '✓ Pass'}
      </span>
      {prob !== undefined && (
        <div className="ml-prob">{Math.round(prob * 100)}%</div>
      )}
    </div>
  );
}

function StudentDrawer({ student, subjects, onClose, onEditMarks }) {
  const riskLvl = getRiskLevel(student.risk_score || 0);
  const rl = RISK_LEVELS[riskLvl];
  const marks = student.subject_marks || [];

  return (
    <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="student-drawer">
        <div className="drawer-header" style={{ borderLeft: `4px solid ${rl.color}` }}>
          <div className="drawer-avatar" style={{ background: rl.color }}>
            {(student.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="drawer-name">{student.name}</div>
            <div className="drawer-meta">{student.student_id} · Section {student.section || '—'} · {student.email || ''}</div>
          </div>
          <button className="btn btn-ghost drawer-close" onClick={onClose}>✕</button>
        </div>

        <div className="drawer-body">
          {/* Risk Overview */}
          <div className="drawer-section">
            <div className="drawer-section-title">🎯 Risk Overview</div>
            <div className="risk-overview-row">
              <div className="risk-gauge-card" style={{ background: rl.bg, borderColor: rl.color }}>
                <div className="risk-score-big" style={{ color: rl.color }}>{student.risk_score || 0}</div>
                <div className="risk-score-label">Risk Score</div>
                <span className={`badge ${rl.badge}`}>{rl.label}</span>
              </div>
              <div className="risk-stats-col">
                <div className="risk-stat-row"><span>Attendance</span><strong style={{ color: student.attendance_percentage < 75 ? '#dc2626' : '#059669' }}>{student.attendance_percentage}%</strong></div>
                <div className="risk-stat-row"><span>Internal Marks</span><strong>{student.internal_marks || '—'}/100</strong></div>
                <div className="risk-stat-row"><span>Prev GPA</span><strong>{student.previous_gpa || '—'}/10</strong></div>
                <div className="risk-stat-row"><span>Study Hrs/day</span><strong>{student.study_hours_per_day || '—'}</strong></div>
                <div className="risk-stat-row"><span>Sleep</span><strong>{student.sleep_duration || '—'} hrs</strong></div>
              </div>
            </div>
          </div>

          {/* ML Predictions */}
          <div className="drawer-section">
            <div className="drawer-section-title">🤖 ML Predictions</div>
            <div className="ml-badges-row">
              <MLBadge label={student.rf_label}  prob={student.rf_probability}  name="Random Forest" />
              <MLBadge label={student.lr_label}  prob={student.lr_probability}  name="Logistic Reg" />
              <MLBadge label={student.knn_label} prob={student.knn_probability} name="KNN" />
              <div className="ml-badge-item ml-ensemble">
                <div className="ml-model-name">Ensemble</div>
                <span className={`ml-badge ${student.risk_label === 'At Risk' ? 'ml-at-risk' : 'ml-pass'}`} style={{ fontSize: 13 }}>
                  {student.risk_label === 'At Risk' ? '⚠ At Risk' : '✓ Pass'}
                </span>
              </div>
            </div>
          </div>

          {/* Subject Marks */}
          {marks.length > 0 && (
            <div className="drawer-section">
              <div className="drawer-section-title">📊 Subject Marks</div>
              <div className="drawer-marks-table">
                <div className="dm-head">
                  <span>Subject</span><span>CBT1</span><span>CAT1</span><span>Assign</span><span>CBT2</span><span>CAT2</span><span>Final</span>
                </div>
                {marks.map((m, i) => (
                  <div key={i} className="dm-row">
                    <span className="dm-subject">{m.subject_name}</span>
                    <span>{m.cbt1}</span><span>{m.cat1}</span><span>{m.assignment}</span>
                    <span>{m.cbt2}</span><span>{m.cat2}</span>
                    <span className={`badge ${m.final_mark < 50 ? 'badge-danger' : m.final_mark < 65 ? 'badge-warning' : 'badge-success'}`}>
                      {m.final_mark}
                    </span>
                  </div>
                ))}
              </div>
              <button className="btn btn-accent" onClick={() => onEditMarks(student)} style={{ marginTop: 12, fontSize: 13 }}>
                ✎ Edit Marks for this Student
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FacultyStudents({ user }) {
  const navigate = useNavigate();
  const [students, setStudents]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedSub, setSelectedSub] = useState('all');
  const [search, setSearch]           = useState('');
  const [riskFilter, setRiskFilter]   = useState('all');
  const [selected, setSelected]       = useState(null);
  const [sortBy, setSortBy]           = useState('risk');

  const assignedSubjects = user?.assigned_subjects || [];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const subjects = assignedSubjects.join(',');
      const data = await fetch(`${API}/faculty/students?subjects=${encodeURIComponent(subjects)}`).then(r => r.json());
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [assignedSubjects]);

  useEffect(() => { load(); }, [load]);

  const atRisk        = students.filter(s => s.risk_label === 'At Risk');
  const totalStudents = students.length;

  let filtered = [...students];
  if (search) {
    filtered = filtered.filter(s =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (riskFilter === 'at-risk') filtered = filtered.filter(s => s.risk_label === 'At Risk');
  if (riskFilter === 'pass')    filtered = filtered.filter(s => s.risk_label === 'Pass');
  if (selectedSub !== 'all') {
    filtered = filtered.filter(s =>
      s.subject_marks?.some(m => m.subject_name === selectedSub)
    );
  }
  if (sortBy === 'risk')        filtered.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  if (sortBy === 'name')        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  if (sortBy === 'attendance')  filtered.sort((a, b) => (a.attendance_percentage || 0) - (b.attendance_percentage || 0));

  return (
    <div className="fs-page">
      {/* Header */}
      <div className="fs-header fade-in">
        <div>
          <h1 className="page-title">My Students</h1>
          <p className="page-subtitle">
            {assignedSubjects.join(' · ')} · {totalStudents} students ·{' '}
            <span style={{ color: '#dc2626', fontWeight: 600 }}>{atRisk.length} at risk</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={load}>↻ Refresh</button>
          <button className="btn btn-accent" id="enter-marks-btn" onClick={() => navigate('/marks')}>＋ Enter Marks</button>
        </div>
      </div>

      {/* At-Risk Alert Banner */}
      {atRisk.length > 0 && (
        <div className="fs-alert-banner fade-in-1">
          <div className="fs-alert-icon">⚠</div>
          <div>
            <strong>{atRisk.length} student{atRisk.length > 1 ? 's are' : ' is'} at risk</strong> and may need immediate intervention.
            <span className="fs-alert-names"> {atRisk.slice(0, 3).map(s => s.name).join(', ')}{atRisk.length > 3 ? ` and ${atRisk.length - 3} more` : ''}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="fs-filters fade-in-1">
        <input
          className="input-field"
          placeholder="🔍 Search by name or ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 300 }}
        />
        <select className="input-field" value={selectedSub} onChange={e => setSelectedSub(e.target.value)} style={{ width: 150 }}>
          <option value="all">All Subjects</option>
          {assignedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input-field" value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ width: 140 }}>
          <option value="all">All Risk Levels</option>
          <option value="at-risk">⚠ At Risk</option>
          <option value="pass">✓ Passing</option>
        </select>
        <select className="input-field" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 150 }}>
          <option value="risk">Sort: Risk Level</option>
          <option value="name">Sort: Name</option>
          <option value="attendance">Sort: Attendance</option>
        </select>
      </div>

      {/* Student Grid */}
      {loading ? (
        <div className="dash-loading"><div className="spinner spinner-dark" /><span>Loading students...</span></div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p>No students match your filters.</p>
        </div>
      ) : (
        <div className="fs-grid fade-in-2">
          {filtered.map((s, i) => {
            const riskLvl = getRiskLevel(s.risk_score || 0);
            const rl = RISK_LEVELS[riskLvl];
            return (
              <div
                key={s.student_id}
                className="fs-student-card card"
                style={{ borderLeft: `4px solid ${rl.color}`, animationDelay: `${i * 0.03}s` }}
                onClick={() => setSelected(s)}
              >
                <div className="fs-card-top">
                  <div className="fs-avatar" style={{ background: rl.color }}>
                    {(s.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="fs-info">
                    <div className="fs-name">{s.name}</div>
                    <div className="fs-id">{s.student_id} · Section {s.section || '—'}</div>
                  </div>
                  <span className={`badge ${rl.badge}`}>{rl.label}</span>
                </div>

                <div className="fs-card-stats">
                  <div className="fs-mini-stat">
                    <span className="fs-mini-label">Risk Score</span>
                    <div className="fs-mini-bar">
                      <div
                        className="fs-mini-fill"
                        style={{ width: `${Math.min(s.risk_score || 0, 100)}%`, background: rl.color }}
                      />
                    </div>
                    <strong style={{ color: rl.color }}>{s.risk_score || 0}</strong>
                  </div>
                  <div className="fs-two-stats">
                    <div className="fs-s2"><span>Attendance</span><strong style={{ color: (s.attendance_percentage || 0) < 75 ? '#dc2626' : '#059669' }}>{s.attendance_percentage || 0}%</strong></div>
                    <div className="fs-s2"><span>Marks</span><strong>{s.internal_marks || '—'}</strong></div>
                  </div>
                </div>

                {(s.subject_marks || []).length > 0 && (
                  <div className="fs-subject-chips">
                    {(s.subject_marks || []).slice(0, 4).map((m, j) => (
                      <span
                        key={j}
                        className={`subject-chip ${m.final_mark < 50 ? 'chip-danger' : m.final_mark < 65 ? 'chip-warn' : 'chip-ok'}`}
                      >
                        {m.subject_name}: {m.final_mark}
                      </span>
                    ))}
                  </div>
                )}

                <div className="fs-view-more">View Details →</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <StudentDrawer
          student={selected}
          subjects={assignedSubjects}
          onClose={() => setSelected(null)}
          onEditMarks={(s) => {
            setSelected(null);
            navigate('/marks', { state: { prefillStudent: s.student_id } });
          }}
        />
      )}
    </div>
  );
}
