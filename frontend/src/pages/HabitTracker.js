import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from 'recharts';
import './HabitTracker.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

const MOOD_EMOJIS  = ['', '😞', '😟', '😐', '😊', '😄'];
const MOOD_LABELS  = ['', 'Very Low', 'Low', 'Neutral', 'Good', 'Excellent'];
const MOOD_COLORS  = ['', '#dc2626', '#f97316', '#eab308', '#22c55e', '#059669'];

const CustomTooltip = ({ active, payload, label, type }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div className="ht-tooltip">
      <div className="ht-tt-label">{label}</div>
      <div className="ht-tt-val">
        {type === 'mood' ? `${MOOD_EMOJIS[v]} ${MOOD_LABELS[v]}` : `${v} hrs`}
      </div>
    </div>
  );
};

export default function HabitTracker({ user }) {
  const [sleepHours, setSleepHours] = useState(7);
  const [mood, setMood]             = useState(3);
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState('');

  const fetchLogs = async () => {
    if (!user?.student_id) return;
    try {
      const data = await fetch(`${API}/daily-log/${user.student_id}`).then(r => r.json());
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [user]);

  const handleSubmit = async () => {
    if (!user?.student_id) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/daily-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: user.student_id, sleep_hours: sleepHours, mood })
      });
      if (!res.ok) throw new Error('Failed to log habits');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
      await fetchLogs();
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const last7     = logs.slice(-7);
  const avgSleep  = last7.length ? (last7.reduce((a, b) => a + (b.sleep_duration || 0), 0) / last7.length).toFixed(1) : '—';
  const avgMood   = last7.length ? (last7.reduce((a, b) => a + (b.mood || 0), 0) / last7.length).toFixed(1) : '—';
  const totalDays = logs.length;

  const sleepStatus = parseFloat(avgSleep) >= 7 ? 'good' : parseFloat(avgSleep) >= 5.5 ? 'warn' : 'bad';
  const moodStatus  = parseFloat(avgMood)  >= 3.5 ? 'good' : parseFloat(avgMood) >= 2.5 ? 'warn' : 'bad';

  const suggestions = [];
  if (parseFloat(avgSleep) < 6)  suggestions.push('💤 Try to get at least 7–8 hours of sleep for better focus and retention.');
  if (parseFloat(avgSleep) > 10) suggestions.push('⏰ Oversleeping can cause sluggishness — aim for 7–9 hours.');
  if (parseFloat(avgMood)  < 2.5) suggestions.push('🧘 Your mood has been low — consider a 10-min mindfulness session daily.');
  if (parseFloat(avgMood)  < 3.5) suggestions.push('🚶 A 30-min daily walk can significantly boost your mood and energy.');
  if (suggestions.length === 0)  suggestions.push('🌟 Excellent habits! Keep up the great sleep routine and positive mindset.');

  return (
    <div className="habit-page">
      {/* Header */}
      <div className="habit-header fade-in">
        <div>
          <h1 className="page-title">Daily Habit Tracker</h1>
          <p className="page-subtitle">Track sleep &amp; mood · Get personalized wellness insights · {totalDays} days logged</p>
        </div>
      </div>

      <div className="habit-main">
        {/* Log Today Panel */}
        <div className="habit-log-panel fade-in-1">
          <div className="card habit-log-card">
            <div className="card-header">
              <h3 className="card-title">📝 Log Today's Habits</h3>
              <span className="today-badge">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            </div>

            {/* Sleep slider */}
            <div className="habit-input-group">
              <div className="habit-input-label">
                <span>😴 Sleep Hours</span>
                <span className="habit-val-badge">{sleepHours} hrs</span>
              </div>
              <input
                type="range" min="4" max="12" step="0.5"
                value={sleepHours}
                onChange={e => setSleepHours(parseFloat(e.target.value))}
                className="habit-slider"
              />
              <div className="sleep-tick-row">
                {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              <div className={`sleep-hint ${sleepHours >= 7 && sleepHours <= 9 ? 'hint-good' : sleepHours < 6 ? 'hint-bad' : 'hint-warn'}`}>
                {sleepHours < 6 ? '⚠ Below recommended — aim for 7–9 hrs' :
                 sleepHours > 9 ? '⚠ More than optimal — target 7–9 hrs' :
                 '✓ Healthy sleep range!'}
              </div>
            </div>

            {/* Mood picker */}
            <div className="habit-input-group">
              <div className="habit-input-label">
                <span>💭 Today's Mood</span>
              </div>
              <div className="mood-picker">
                {[1, 2, 3, 4, 5].map(m => (
                  <button
                    key={m}
                    id={`mood-btn-${m}`}
                    className={`mood-btn ${mood === m ? 'mood-selected' : ''}`}
                    onClick={() => setMood(m)}
                    style={mood === m ? { borderColor: MOOD_COLORS[m], background: `${MOOD_COLORS[m]}22` } : {}}
                  >
                    <span className="mood-emoji">{MOOD_EMOJIS[m]}</span>
                    <span className="mood-label-text" style={mood === m ? { color: MOOD_COLORS[m] } : {}}>{MOOD_LABELS[m]}</span>
                  </button>
                ))}
              </div>
            </div>

            {error   && <div className="error-box">{error}</div>}
            {success && <div className="ht-success">✓ Today's habits logged successfully! Your dashboard has been updated.</div>}

            <button
              className="btn btn-primary"
              id="submit-habit-btn"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ width: '100%', padding: '12px', marginTop: 8, fontSize: 14 }}
            >
              {submitting ? '⏳ Logging...' : '✔ Submit Today\'s Log'}
            </button>
          </div>

          {/* Suggestions */}
          <div className="card suggestions-card fade-in-2">
            <h3 className="card-title">💡 Personalized Suggestions</h3>
            <div className="suggestions-list">
              {suggestions.map((s, i) => (
                <div key={i} className="suggestion-item">{s}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats + Charts */}
        <div className="habit-right-panel">
          {/* Stat cards */}
          <div className="habit-stats fade-in-1">
            <div className={`ht-stat-card ht-stat-${sleepStatus}`}>
              <div className="ht-stat-icon">😴</div>
              <div className="ht-stat-val">{avgSleep}h</div>
              <div className="ht-stat-label">Avg Sleep (7 days)</div>
              <div className="ht-stat-status">
                {sleepStatus === 'good' ? '✓ Healthy range' : sleepStatus === 'warn' ? '↓ Could improve' : '⚠ Needs attention'}
              </div>
            </div>
            <div className={`ht-stat-card ht-stat-${moodStatus}`}>
              <div className="ht-stat-icon">💭</div>
              <div className="ht-stat-val">{avgMood}/5</div>
              <div className="ht-stat-label">Avg Mood (7 days)</div>
              <div className="ht-stat-status">
                {moodStatus === 'good' ? '✓ Positive outlook' : moodStatus === 'warn' ? '↓ Mixed feelings' : '⚠ Needs support'}
              </div>
            </div>
            <div className="ht-stat-card ht-stat-neutral">
              <div className="ht-stat-icon">📅</div>
              <div className="ht-stat-val">{totalDays}</div>
              <div className="ht-stat-label">Total Days Logged</div>
              <div className="ht-stat-status">
                {totalDays >= 20 ? '✓ Consistent tracker!' : totalDays >= 7 ? '↑ Building habit' : '▶ Just getting started'}
              </div>
            </div>
          </div>

          {/* Charts */}
          {loading ? (
            <div className="ht-loading"><div className="spinner spinner-dark" />Loading trend data...</div>
          ) : logs.length === 0 ? (
            <div className="ht-empty card">
              <div style={{ fontSize: 40 }}>📈</div>
              <h3>No habit data yet</h3>
              <p>Start logging your daily habits to see 30-day trend charts appear here.</p>
            </div>
          ) : (
            <div className="habit-charts fade-in-2">
              <div className="card chart-card">
                <div className="card-header">
                  <h3 className="card-title">😴 Sleep Trend (Last {logs.length} days)</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={logs} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={d => d.slice(5)} />
                    <YAxis domain={[4, 12]} tick={{ fontSize: 10, fill: 'var(--text3)' }} ticks={[4, 6, 7, 8, 10, 12]} />
                    <Tooltip content={<CustomTooltip type="sleep" />} />
                    <ReferenceLine y={7} stroke="#22c55e" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="sleep_duration" name="Sleep"
                      stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card chart-card">
                <div className="card-header">
                  <h3 className="card-title">💭 Mood Trend (Last {logs.length} days)</h3>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={logs} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text3)' }} tickFormatter={d => d.slice(5)} />
                    <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10, fill: 'var(--text3)' }} />
                    <Tooltip content={<CustomTooltip type="mood" />} />
                    <ReferenceLine y={3.5} stroke="#22c55e" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="mood" name="Mood"
                      stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
