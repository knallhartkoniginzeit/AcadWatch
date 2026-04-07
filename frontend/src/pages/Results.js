import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis } from 'recharts';
import './Results.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

const MOOD_EMOJIS = ['', '😞', '😟', '😐', '😊', '😄'];

function MLModelPanel({ result }) {
  const models = [
    { name: 'Random Forest', label: result.rf_label,  prob: result.rf_probability,  key: 'rf'  },
    { name: 'Logistic Reg.',  label: result.lr_label,  prob: result.lr_probability,  key: 'lr'  },
    { name: 'KNN',            label: result.knn_label, prob: result.knn_probability, key: 'knn' },
  ];
  const ensemble = result.risk_label;
  const agreement = result.model_agreement;
  const allDefined = models.every(m => m.label);

  if (!allDefined) return null;

  return (
    <div className="card ml-panel fade-in-2">
      <div className="card-header">
        <h3 className="card-title">🤖 ML Model Predictions</h3>
        {agreement !== undefined && (
          <span className="agreement-badge">{agreement}% agreement</span>
        )}
      </div>
      <div className="ml-models-row">
        {models.map(m => {
          const isAtRisk = m.label === 'At Risk';
          const pct = Math.round((m.prob || 0) * 100);
          return (
            <div key={m.key} className={`ml-model-card ${isAtRisk ? 'ml-atrisk' : 'ml-pass'}`}>
              <div className="ml-model-header">
                <span className="ml-model-name">{m.name}</span>
                <span className={`ml-verdict ${isAtRisk ? 'verdict-danger' : 'verdict-ok'}`}>
                  {isAtRisk ? '⚠ At Risk' : '✓ Pass'}
                </span>
              </div>
              <div className="ml-prob-bar-wrap">
                <div className="ml-prob-bar-bg">
                  <div
                    className="ml-prob-bar-fill"
                    style={{ width: `${pct}%`, background: isAtRisk ? '#dc2626' : '#22c55e' }}
                  />
                </div>
                <span className="ml-prob-pct" style={{ color: isAtRisk ? '#dc2626' : '#059669' }}>{pct}%</span>
              </div>
              <div className="ml-prob-label">Risk probability</div>
            </div>
          );
        })}
      </div>

      {/* Ensemble verdict */}
      <div className={`ensemble-verdict ${ensemble === 'At Risk' ? 'ev-danger' : 'ev-ok'}`}>
        <div className="ev-left">
          <span className="ev-icon">{ensemble === 'At Risk' ? '⚠' : '✓'}</span>
          <div>
            <div className="ev-title">Ensemble Decision</div>
            <div className="ev-sub">Majority vote across all 3 models</div>
          </div>
        </div>
        <span className={`ev-result ${ensemble === 'At Risk' ? 'ev-result-danger' : 'ev-result-ok'}`}>
          {ensemble}
        </span>
      </div>
    </div>
  );
}

function HabitInsights({ logs }) {
  if (!logs || logs.length === 0) return null;
  const last7 = logs.slice(-7);
  const avgSleep = (last7.reduce((a, b) => a + (b.sleep_duration || 0), 0) / last7.length).toFixed(1);
  const avgMood  = (last7.reduce((a, b) => a + (b.mood || 0), 0) / last7.length).toFixed(1);
  const recentMood = logs[logs.length - 1]?.mood || 3;

  return (
    <div className="card habit-insights fade-in-2">
      <h3 className="card-title">🌱 Habit Insights (7-day avg)</h3>
      <div className="hi-row">
        <div className="hi-stat">
          <div className="hi-icon">😴</div>
          <div className="hi-val">{avgSleep}h</div>
          <div className="hi-label">Avg Sleep</div>
          <div className={`hi-status ${parseFloat(avgSleep) >= 7 ? 'hi-good' : 'hi-warn'}`}>
            {parseFloat(avgSleep) >= 7 ? '✓ Healthy' : '↓ Low'}
          </div>
        </div>
        <div className="hi-stat">
          <div className="hi-icon">{MOOD_EMOJIS[Math.round(recentMood)]}</div>
          <div className="hi-val">{avgMood}/5</div>
          <div className="hi-label">Avg Mood</div>
          <div className={`hi-status ${parseFloat(avgMood) >= 3.5 ? 'hi-good' : 'hi-warn'}`}>
            {parseFloat(avgMood) >= 3.5 ? '✓ Positive' : '↓ Low'}
          </div>
        </div>
        <div className="hi-stat">
          <div className="hi-icon">📅</div>
          <div className="hi-val">{logs.length}</div>
          <div className="hi-label">Days Logged</div>
          <div className="hi-status hi-good">Keep tracking!</div>
        </div>
      </div>
    </div>
  );
}

export default function Results({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult]           = useState(location.state?.result || null);
  const [subjectMarks, setSubjectMarks] = useState([]);
  const [habitLogs, setHabitLogs]     = useState([]);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    const studentId = user?.student_id || result?.student_id;
    if (studentId) {
      setLoading(true);
      const promises = [
        fetch(`${API}/students/${studentId}`).then(r => r.json()),
        fetch(`${API}/subjects/marks/${studentId}`).then(r => r.json()),
      ];
      if (user?.role === 'student') {
        promises.push(fetch(`${API}/daily-log/${studentId}`).then(r => r.json()));
      }
      Promise.all(promises)
        .then(([studentData, marksData, logs]) => {
          // Attach ML data from student upsert if available on studentData
          setResult(prev => ({ ...studentData, ...prev, ...studentData }));
          setSubjectMarks(Array.isArray(marksData) ? marksData : []);
          setHabitLogs(Array.isArray(logs) ? logs : []);
        })
        .finally(() => setLoading(false));
    }
  }, [user, location.state]);

  if (loading) return <div className="dash-loading"><div className="spinner spinner-dark" />Loading your profile...</div>;

  if (!result) return (
    <div className="results-empty">
      <h2>No data found</h2>
      <button className="btn btn-accent" onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );

  const isAtRisk = result.risk_label === 'At Risk';
  const riskPct  = Math.round((result.risk_probability || 0) * 100);
  const pieData  = [
    { name: 'Risk', value: riskPct,       color: isAtRisk ? '#dc2626' : '#d1d5db' },
    { name: 'Safe', value: 100 - riskPct, color: '#059669' },
  ];

  // Subject risk levels
  const getSubjectRiskLevel = (finalMark) => {
    if (finalMark < 40) return { label: 'High Risk', cls: 'badge-danger' };
    if (finalMark < 50) return { label: 'At Risk',   cls: 'badge-warning' };
    if (finalMark < 65) return { label: 'Medium',    cls: 'badge-accent'  };
    return { label: 'Good',    cls: 'badge-success' };
  };

  // Personalized suggestions
  const suggestions = [];
  if (subjectMarks.some(m => m.final_mark < 50)) suggestions.push({ icon: '📚', text: 'Some subjects are below 50 — focus on weak subjects first and join study groups.' });
  if ((result.attendance_percentage || 0) < 75)  suggestions.push({ icon: '📅', text: 'Attendance is critically low. Set daily reminders and buddy up with a peer.' });
  if ((result.sleep_duration || 0) < 6 || habitLogs.slice(-7).some(l => (l.sleep_duration || 0) < 6))
    suggestions.push({ icon: '😴', text: 'Sleep quality affects memory. Aim for 7–8 hours each night.' });
  if (habitLogs.length > 0 && habitLogs.slice(-7).reduce((a, b) => a + (b.mood || 0), 0) / Math.min(7, habitLogs.length) < 2.5)
    suggestions.push({ icon: '🧘', text: 'Your mood has been low recently. Consider talking to a counselor or taking mindfulness breaks.' });
  if ((result.study_hours_per_day || 0) < 2)     suggestions.push({ icon: '⏱️', text: 'Study at least 3 hours daily. Use Pomodoro technique: 25 min on, 5 min break.' });
  if (suggestions.length === 0)                   suggestions.push({ icon: '🌟', text: 'Excellent performance! Keep maintaining your habits and help peers in study groups.' });

  return (
    <div className="results-page">
      <div className="results-top fade-in">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <div>
          <h1 className="page-title">
            {user?.role === 'student' ? '📊 My Academic Profile' : '🎯 Student Prediction'}
          </h1>
          <p className="page-subtitle">{result.name} · {result.student_id} · Section {result.section || '—'}</p>
        </div>
        {user?.role === 'student' && (
          <button className="btn btn-accent" onClick={() => navigate('/habits')}>🌱 Log Habits</button>
        )}
      </div>

      {/* Risk Banner */}
      <div className={`risk-banner fade-in ${isAtRisk ? 'banner-danger' : 'banner-success'}`}>
        <div className="banner-left">
          <div className="banner-indicator" style={{ background: isAtRisk ? 'var(--danger)' : 'var(--success)' }} />
          <div>
            <div className="banner-label">{isAtRisk ? '⚠ At Risk' : '✓ On Track'}</div>
            <div className="banner-sub">
              {isAtRisk
                ? `${riskPct}% probability of academic failure — intervention recommended`
                : 'Performance is stable — keep up the good work'}
            </div>
          </div>
        </div>
        <div className="banner-score">{result.risk_score}<span>/100</span></div>
      </div>

      {/* ML Predictions Panel */}
      <MLModelPanel result={result} />

      {/* Habit Insights (student only) */}
      {user?.role === 'student' && <HabitInsights logs={habitLogs} />}

      {/* Subject Marks Table */}
      <div className="card fade-in-1" style={{ marginTop: 0 }}>
        <div className="card-header">
          <h3 className="card-title">📋 Subject-wise Assessment</h3>
          <span className="card-hint">Final = (CBT1+CAT1+Assign+CBT2+CAT2)/190 × 100</span>
        </div>
        <div className="at-risk-table">
          <div className="table-head" style={{ gridTemplateColumns: 'minmax(120px,1.5fr) repeat(5,70px) 80px 90px' }}>
            <span>Subject</span>
            <span>CBT1 /30</span><span>CAT1 /60</span><span>Assign /40</span>
            <span>CBT2 /20</span><span>CAT2 /40</span>
            <span>Final /100</span>
            <span>Risk</span>
          </div>
          {subjectMarks.length > 0 ? subjectMarks.map((m, i) => {
            const rl = getSubjectRiskLevel(m.final_mark);
            return (
              <div key={i} className="table-row-item" style={{ gridTemplateColumns: 'minmax(120px,1.5fr) repeat(5,70px) 80px 90px' }}>
                <span className="student-nm">{m.subject_name}</span>
                <span className="cell-text">{m.cbt1 || 0}</span>
                <span className="cell-text">{m.cat1 || 0}</span>
                <span className="cell-text">{m.assignment || 0}</span>
                <span className="cell-text">{m.cbt2 || 0}</span>
                <span className="cell-text">{m.cat2 || 0}</span>
                <span className={`badge ${m.final_mark >= 65 ? 'badge-success' : m.final_mark >= 50 ? 'badge-accent' : 'badge-danger'}`}>
                  {m.final_mark || 0}
                </span>
                <span className={`badge ${rl.cls}`} style={{ fontSize: 10 }}>{rl.label}</span>
              </div>
            );
          }) : (
            <div className="empty-state">No subject marks recorded yet.</div>
          )}
        </div>
      </div>

      <div className="results-grid fade-in-2">
        {/* Risk Gauge */}
        <div className="card gauge-card">
          <h3 className="card-title">Overall Risk Probability</h3>
          <div style={{ position: 'relative' }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="70%" startAngle={180} endAngle={0}
                  innerRadius={60} outerRadius={78} dataKey="value" strokeWidth={0}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="gauge-center">
              <span className="gauge-num" style={{ color: isAtRisk ? 'var(--danger)' : 'var(--success)' }}>{riskPct}%</span>
              <span className="gauge-sub">Risk</span>
            </div>
          </div>
          <div className="gauge-legend">
            <div className="gauge-leg-item">
              <div className="gauge-dot" style={{ background: isAtRisk ? '#dc2626' : '#d1d5db' }} />
              <span>At Risk ({riskPct}%)</span>
            </div>
            <div className="gauge-leg-item">
              <div className="gauge-dot" style={{ background: '#059669' }} />
              <span>Safe ({100 - riskPct}%)</span>
            </div>
          </div>
        </div>

        {/* Suggestions */}
        <div className="card">
          <h3 className="card-title">💡 Personalized Improvement Plan</h3>
          <div className="factors-list">
            {suggestions.map((s, i) => (
              <div key={i} className="suggestion-row">
                <span className="suggestion-icon">{s.icon}</span>
                <span className="suggestion-text">{s.text}</span>
              </div>
            ))}
          </div>
          {user?.role === 'student' && (
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: 12 }}
              onClick={() => navigate('/recommendations')}>
              View Full Recommendation Plan →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
