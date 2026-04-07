import React, { useState, useEffect, useCallback } from 'react';
import './PeerGroups.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

const SUBJECTS = ['TLA', 'ML', 'OS', 'DE', 'DPCO', 'ML Lab', 'OS Lab', 'PDL', 'SS', 'CSBL'];

function MemberCard({ member }) {
  const isMentor = member.role === 'Mentor';
  return (
    <div className={`member-card ${isMentor ? 'mentor-card' : 'learner-card'}`}>
      <div className={`member-avatar ${isMentor ? 'mentor-av' : 'learner-av'}`}>
        {(member.name || member.student_id).split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div className="member-info">
        <div className="member-name">{member.name || member.student_id}</div>
        <div className="member-id">{member.student_id} · Sec {member.section || '—'}</div>
        <div className="member-mark">
          {isMentor ? `Score: ${member.final_mark}` : `Mark: ${member.final_mark}`}
        </div>
      </div>
      <span className={`role-badge ${isMentor ? 'mentor-badge' : 'learner-badge'}`}>
        {isMentor ? '🌟 Mentor' : '📚 Learner'}
      </span>
    </div>
  );
}

function GroupCard({ group, index }) {
  const [open, setOpen] = useState(index < 3);
  return (
    <div className="group-card card fade-in">
      <div className="group-card-header" onClick={() => setOpen(o => !o)}>
        <div className="group-card-left">
          <div className="group-number-badge">G{group.group_number}</div>
          <div>
            <div className="group-title">{group.subject} — Study Group {group.group_number}</div>
            <div className="group-meta">
              <span className="learner-count">📚 {group.learners.length} Learner{group.learners.length !== 1 ? 's' : ''}</span>
              <span className="mentor-count">🌟 {group.mentors.length} Mentor{group.mentors.length !== 1 ? 's' : ''}</span>
              <span className="total-count">👥 {group.members.length} Members</span>
            </div>
          </div>
        </div>
        <button className={`expand-btn ${open ? 'open' : ''}`}>{open ? '▲' : '▼'}</button>
      </div>

      {open && (
        <div className="group-body">
          {group.mentors.length > 0 && (
            <div className="role-section">
              <div className="role-section-title mentor-title">
                <span className="role-dot mentor-dot" />
                🌟 Mentors (High Performers)
              </div>
              <div className="member-list">
                {group.mentors.map((m, i) => <MemberCard key={i} member={m} />)}
              </div>
            </div>
          )}
          {group.learners.length > 0 && (
            <div className="role-section">
              <div className="role-section-title learner-title">
                <span className="role-dot learner-dot" />
                📚 Learners (At-Risk Students)
              </div>
              <div className="member-list">
                {group.learners.map((m, i) => <MemberCard key={i} member={m} />)}
              </div>
            </div>
          )}

          <div className="guidelines-box">
            <div className="guide-title">📋 Peer Learning Guidelines</div>
            <div className="guide-grid">
              <div className="guide-item">
                <span className="guide-icon">🗓️</span>
                <div>Meet at least <strong>twice per week</strong> for focused study sessions</div>
              </div>
              <div className="guide-item">
                <span className="guide-icon">🎯</span>
                <div>Mentors should <strong>explain concepts</strong>, not just provide answers</div>
              </div>
              <div className="guide-item">
                <span className="guide-icon">📝</span>
                <div>Learners should <strong>prepare questions</strong> before each session</div>
              </div>
              <div className="guide-item">
                <span className="guide-icon">✅</span>
                <div>Track <strong>progress weekly</strong> and report to faculty</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PeerGroups({ user }) {
  const [groups, setGroups]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedSub, setSelectedSub] = useState('all');
  const [view, setView]             = useState('by-subject');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedSub === 'all'
        ? `${API}/peer-groups`
        : `${API}/peer-groups?subject=${encodeURIComponent(selectedSub)}`;
      const data = await fetch(url).then(r => r.json());
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSub]);

  useEffect(() => { load(); }, [load]);

  // Group by subject for display
  const bySubject = groups.reduce((acc, g) => {
    if (!acc[g.subject]) acc[g.subject] = [];
    acc[g.subject].push(g);
    return acc;
  }, {});

  const totalLearners = groups.reduce((a, g) => a + g.learners.length, 0);
  const totalMentors  = groups.reduce((a, g) => a + g.mentors.length, 0);

  return (
    <div className="pg-page">
      {/* Header */}
      <div className="pg-header fade-in">
        <div>
          <h1 className="page-title">👥 Peer Mentoring Groups</h1>
          <p className="page-subtitle">
            Auto-paired study groups · {groups.length} groups total ·
            {totalLearners} learners + {totalMentors} mentors
          </p>
        </div>
        <button className="btn btn-primary" onClick={load} disabled={loading} id="refresh-groups-btn">
          {loading ? '⟳ Loading...' : '↻ Regenerate Groups'}
        </button>
      </div>

      {/* Stats row */}
      <div className="pg-stats fade-in-1">
        <div className="pg-stat-card pg-stat-blue">
          <div className="pg-stat-val">{groups.length}</div>
          <div className="pg-stat-label">Total Groups</div>
        </div>
        <div className="pg-stat-card pg-stat-red">
          <div className="pg-stat-val">{totalLearners}</div>
          <div className="pg-stat-label">At-Risk Learners</div>
        </div>
        <div className="pg-stat-card pg-stat-green">
          <div className="pg-stat-val">{totalMentors}</div>
          <div className="pg-stat-label">High-Perf Mentors</div>
        </div>
        <div className="pg-stat-card pg-stat-purple">
          <div className="pg-stat-val">{Object.keys(bySubject).length}</div>
          <div className="pg-stat-label">Subjects Covered</div>
        </div>
      </div>

      {/* Filters */}
      <div className="pg-filters fade-in-1">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${selectedSub === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedSub('all')}
          >
            All Subjects
          </button>
          {SUBJECTS.map(s => (
            <button
              key={s}
              className={`filter-tab ${selectedSub === s ? 'active' : ''}`}
              onClick={() => setSelectedSub(s === selectedSub ? 'all' : s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="pg-loading">
          <div className="spinner spinner-dark" />
          <span>Generating peer groups...</span>
        </div>
      ) : groups.length === 0 ? (
        <div className="pg-empty card fade-in">
          <div style={{ fontSize: 48 }}>👥</div>
          <h3>No peer groups yet</h3>
          <p>Seed student data first, then groups will be auto-generated based on performance.</p>
        </div>
      ) : (
        <div className="pg-content">
          {view === 'by-subject'
            ? Object.entries(bySubject).map(([sub, subGroups]) => (
                <div key={sub} className="subject-section">
                  <div className="subject-section-header">
                    <span className="subject-pill">{sub}</span>
                    <span className="subject-count">{subGroups.length} group{subGroups.length !== 1 ? 's' : ''}</span>
                  </div>
                  {subGroups.map((g, i) => <GroupCard key={g.group_id} group={g} index={i} />)}
                </div>
              ))
            : groups.map((g, i) => <GroupCard key={g.group_id} group={g} index={i} />)
          }
        </div>
      )}
    </div>
  );
}
