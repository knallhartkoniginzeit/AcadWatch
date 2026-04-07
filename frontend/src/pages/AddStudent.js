import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AddStudent.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

const EMPTY_MARK = {
  cbt1: 0, cat1: 0, assignment: 0, cbt2: 0, cat2: 0
};

const MARK_COMPONENTS = [
  { key: 'cbt1', label: 'CBT 1', max: 30,  step: 1, unit: '/30' },
  { key: 'cat1', label: 'CAT 1', max: 60,  step: 1, unit: '/60' },
  { key: 'assignment', label: 'Assignment', max: 40,  step: 1, unit: '/40' },
  { key: 'cbt2', label: 'CBT 2', max: 20,  step: 1, unit: '/20' },
  { key: 'cat2', label: 'CAT 2', max: 40,  step: 1, unit: '/40' },
];

export default function AddStudent({ user }) {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedSubject, setSelectedSubject] = useState(user?.assigned_subjects?.[0] || '');
  const [marks, setMarks] = useState(EMPTY_MARK);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const assignedSubjects = user?.assigned_subjects || [];

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/students`)
      .then(r => r.json())
      .then(data => setStudents(data))
      .catch(e => setError('Failed to load students'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedStudent && selectedSubject) {
      fetch(`${API}/subjects/marks/${selectedStudent}`)
        .then(r => r.json())
        .then(data => {
          const subMark = data.find(m => m.subject_name === selectedSubject);
          if (subMark) {
            setMarks({
              cbt1: subMark.cbt1 || 0,
              cat1: subMark.cat1 || 0,
              assignment: subMark.assignment || 0,
              cbt2: subMark.cbt2 || 0,
              cat2: subMark.cat2 || 0
            });
          } else {
            setMarks(EMPTY_MARK);
          }
        });
    }
  }, [selectedStudent, selectedSubject]);

  const handleMarkChange = (key, val) => {
    setMarks(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));
    setSuccess(null);
  };

  const handleSave = async () => {
    if (!selectedStudent || !selectedSubject) {
      setError('Please select a student and subject');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/subjects/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent,
          subject_name: selectedSubject,
          ...marks,
          updated_by: user?.username || 'faculty'
        })
      });
      if (!res.ok) throw new Error('Failed to save');
      setSuccess('Marks updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-page">
      <div className="page-header fade-in">
        <div>
          <h1 className="page-title">Manage Subject Marks</h1>
          <p className="page-subtitle">Enter component marks for your assigned subjects. Final internal marks are calculated automatically.</p>
        </div>
      </div>

      <div className="add-form fade-in-1">
        <div className="form-section card">
          <div className="sec-header">
            <h3 className="sec-title">Selection</h3>
          </div>
          <div className="sec-fields grid-2">
            <div className="input-group">
              <label className="input-label">Subject</label>
              <select 
                className="input-field" 
                value={selectedSubject} 
                onChange={e => setSelectedSubject(e.target.value)}
              >
                {assignedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Student</label>
              <select 
                className="input-field" 
                value={selectedStudent} 
                onChange={e => setSelectedStudent(e.target.value)}
              >
                <option value="">-- Select Student --</option>
                {students.map(s => <option key={s.student_id} value={s.student_id}>{s.name} ({s.student_id})</option>)}
              </select>
            </div>
          </div>
        </div>

        {selectedStudent && (
          <div className="form-section card">
            <div className="sec-header">
              <span className="sec-dot" style={{background: 'var(--accent)'}} />
              <h3 className="sec-title">Assessment Components for {selectedSubject}</h3>
            </div>
            <div className="sec-fields">
              {MARK_COMPONENTS.map(comp => (
                <div key={comp.key} className="input-group">
                  <div className="label-row">
                    <label className="input-label">{comp.label}</label>
                    <span className="range-val">{marks[comp.key]}{comp.unit}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={comp.max} 
                    step={comp.step} 
                    value={marks[comp.key]} 
                    onChange={e => handleMarkChange(comp.key, e.target.value)}
                  />
                </div>
              ))}
              
              <div className="final-mark-preview">
                <strong>Calculated Internal Mark: </strong>
                <span className="badge badge-success">
                  {((Object.values(marks).reduce((a,b)=>a+b, 0) * 100) / 190).toFixed(1)} / 100
                </span>
              </div>
            </div>
          </div>
        )}

        {error && <div className="error-box">{error}</div>}
        {success && <div className="success-box" style={{background: 'var(--success-bg)', color: 'var(--success-text)', padding: 10, borderRadius: 8, marginBottom: 20}}>✓ {success}</div>}

        <div className="submit-row">
          <button 
            className="btn btn-primary submit-btn" 
            onClick={handleSave} 
            disabled={saving || !selectedStudent}
          >
            {saving ? 'Saving...' : '◈ Update Subject Marks'}
          </button>
        </div>
      </div>
    </div>
  );
}
