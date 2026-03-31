import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Students.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all');

  useEffect(() => {
    fetch(`${API}/students`)
      .then(r => r.json())
      .then(d => setStudents(Array.isArray(d) ? d : []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.student_id?.includes(q) || s.section?.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || s.risk_label === (filter === 'risk' ? 'At Risk' : 'Pass');
    return matchSearch && matchFilter;
  });

  const atRisk = students.filter(s => s.risk_label === 'At Risk').length;

  return (
    <div className="students-page">
      <div className="page-header fade-in">
        <div>
          <h1 className="page-title">All Students</h1>
          <p className="page-subtitle">{students.length} total · {atRisk} at risk</p>
        </div>
        <button className="btn btn-accent" onClick={() => navigate('/add')}>＋ Add Student</button>
      </div>

      <div className="filter-bar fade-in-1">
        <input
          className="input-field search-input"
          placeholder="Search by name, ID or section..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="filter-tabs">
          {['all','risk','pass'].map(f => (
            <button key={f} className={`filter-tab ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
              {f==='all'?'All':f==='risk'?'At Risk':'Passing'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="load-center"><span className="spinner spinner-dark"/>Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="load-center" style={{color:'var(--text3)'}}>No students found</div>
      ) : (
        <div className="students-table card fade-in-2">
          <div className="st-header">
            <span>Student</span><span>Section</span>
            <span>Attendance</span><span>Marks</span><span>GPA</span>
            <span>Risk Score</span><span>Status</span><span>Action</span>
          </div>
          {filtered.map((s,i) => {
            const isRisk = s.risk_label === 'At Risk';
            return (
              <div key={s.student_id} className={`st-row ${isRisk?'row-risk':''}`}
                style={{animationDelay:`${i*0.03}s`}}>
                <div className="student-cell">
                  <div className={`student-av ${isRisk?'danger-av':'success-av'}`}>
                    {(s.name||'?').split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <div className="student-nm">{s.name}</div>
                    <div className="student-id">{s.student_id}</div>
                  </div>
                </div>
                <span className="cell-text">{s.section||'—'}</span>
                <span className={`cell-text ${s.attendance_percentage<75?'text-danger':s.attendance_percentage<85?'text-warning':''}`}>
                  {s.attendance_percentage}%
                </span>
                <span className={`cell-text ${s.internal_marks<50?'text-danger':s.internal_marks<65?'text-warning':''}`}>
                  {s.internal_marks}/100
                </span>
                <span className="cell-text">{s.previous_gpa}/10</span>
                <div className="score-cell">
                  <div className="score-bar-bg">
                    <div className={`score-bar-fill ${isRisk?'danger-bar':'success-bar'}`}
                      style={{width:`${s.risk_score||0}%`}} />
                  </div>
                  <span className="score-num">{s.risk_score||'—'}</span>
                </div>
                <span className={`badge ${isRisk?'badge-danger':'badge-success'}`}>
                  {s.risk_label}
                </span>
                <button className="btn btn-ghost" style={{fontSize:12,padding:'5px 10px'}}
                  onClick={() => navigate('/add', {state:{prefill:s}})}>
                  Update
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
