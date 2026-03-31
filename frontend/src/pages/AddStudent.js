import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AddStudent.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

const EMPTY = {
  student_id:'', name:'', section:'', email:'',
  internal_marks:60, previous_gpa:6.0, assignment_scores:65,
  attendance_percentage:80, study_hours_per_day:3,
  sleep_duration:7, mobile_usage_time:4,
  stress_level:5, interest_in_subject:6,
  updated_by:'teacher'
};

const SECTIONS = [
  {
    title:'Identity', fields:[
      {key:'name',           label:'Student Name',    type:'text',  placeholder:'e.g. Ananya Sharma'},
      {key:'student_id',     label:'Student ID',      type:'text',  placeholder:'e.g. CS21001'},
      {key:'section',        label:'Section',         type:'text',  placeholder:'e.g. A'},
      {key:'email',          label:'Email (optional)',type:'text',  placeholder:'student@college.edu'},
    ]
  },
  {
    title:'Academic Factors', color:'#3b82f6', fields:[
      {key:'internal_marks',    label:'Internal Marks',     type:'range', min:0, max:100, step:1, unit:'/100', danger:50, warning:65},
      {key:'previous_gpa',      label:'Previous GPA',       type:'range', min:0, max:10,  step:0.1,unit:'/10',  danger:5,  warning:6.5},
      {key:'assignment_scores', label:'Assignment Scores',  type:'range', min:0, max:100, step:1, unit:'/100', danger:50, warning:65},
    ]
  },
  {
    title:'Behavioral Factors', color:'#059669', fields:[
      {key:'attendance_percentage', label:'Attendance %',         type:'range', min:0, max:100, step:1,   unit:'%',    danger:75, warning:85},
      {key:'study_hours_per_day',   label:'Study Hours / Day',    type:'range', min:0, max:12,  step:0.5, unit:' hrs', danger:2,  warning:3},
    ]
  },
  {
    title:'Lifestyle Factors', color:'#d97706', fields:[
      {key:'sleep_duration',    label:'Sleep Duration',      type:'range', min:0, max:12,  step:0.5, unit:' hrs',    danger:6,  warning:7},
      {key:'mobile_usage_time', label:'Mobile Usage / Day',  type:'range', min:0, max:16,  step:0.5, unit:' hrs',    invert:true, danger:8, warning:6},
    ]
  },
  {
    title:'Psychological Factors', color:'#6366f1', fields:[
      {key:'stress_level',        label:'Stress Level',        type:'range', min:1, max:10, step:1, unit:'/10', invert:true, danger:8, warning:6},
      {key:'interest_in_subject', label:'Interest in Subject', type:'range', min:1, max:10, step:1, unit:'/10', danger:4, warning:6},
    ]
  }
];

function rangeColor(key, value, field) {
  if (!field.danger) return 'var(--accent)';
  if (field.invert) {
    if (value >= field.danger) return 'var(--danger)';
    if (value >= field.warning) return 'var(--warning)';
    return 'var(--success)';
  } else {
    if (value <= field.danger) return 'var(--danger)';
    if (value <= field.warning) return 'var(--warning)';
    return 'var(--success)';
  }
}

export default function AddStudent({ user }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [form, setForm]     = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);
  const [result, setResult] = useState(null);

  const role = user?.role || 'teacher';
  
  // Pre-fill if navigated from Students page or if logged in as student
  useEffect(() => {
    if (role === 'student' && user?.student_id) {
      setLoading(true);
      fetch(`${API}/students/${user.student_id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) setForm(prev => ({...prev, ...data}));
          else setForm(prev => ({...prev, student_id: user.student_id}));
        })
        .finally(() => setLoading(false));
    } else if (location.state?.prefill) {
      const p = location.state.prefill;
      setForm(prev => ({...prev, ...p}));
    }
  }, [location.state, role, user]);

  const handleChange = (key, value) => setForm(prev => ({...prev, [key]:value}));

  const handleSubmit = async () => {
    if (!form.name || !form.student_id) {
      setError('Student Name and ID are required.'); return;
    }
    setError(null); setLoading(true);
    try {
      const payload = {...form, updated_by: role};
      for (const k of ['internal_marks','previous_gpa','assignment_scores',
                        'attendance_percentage','study_hours_per_day','sleep_duration','mobile_usage_time']) {
        payload[k] = parseFloat(payload[k]);
      }
      for (const k of ['stress_level','interest_in_subject']) {
        payload[k] = parseInt(payload[k]);
      }
      const res = await fetch(`${API}/students`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
      navigate('/results', {state:{result:data, mode:'single'}});
    } catch {
      setError('Could not connect to the backend. Make sure the API is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const isUpdate = !!location.state?.prefill;

  return (
    <div className="add-page">
      <div className="page-header fade-in">
        <div>
          <h1 className="page-title">{isUpdate || role === 'student' ? 'Update Details' : 'Add / Update Student'}</h1>
          <p className="page-subtitle">Data is saved to Excel and tracked daily. Risk prediction runs automatically.</p>
        </div>
        {role === 'teacher' && isUpdate && (
          <button className="btn btn-ghost" onClick={() => { setForm(EMPTY); navigate('/add'); }}>
            + New Student
          </button>
        )}
      </div>

      {role === 'student' && (
        <div className="role-selector fade-in-1">
          <span className="role-note">🎓 You are logged in as a Student. You can only update your daily behaviors and lifestyle metrics.</span>
        </div>
      )}

      {error && <div className="error-box fade-in">⚠ {error}</div>}

      <div className="add-form fade-in-1">
        {SECTIONS.map(sec => (
          <div key={sec.title} className="form-section card">
            <div className="sec-header">
              {sec.color && <span className="sec-dot" style={{background:sec.color}} />}
              <h3 className="sec-title">{sec.title}</h3>
            </div>
            <div className="sec-fields">
              {sec.fields.map(field => {
                const val = form[field.key];
                const color = field.type==='range' ? rangeColor(field.key, val, field) : null;
                const STUDENT_ALLOWED = ['study_hours_per_day','sleep_duration','mobile_usage_time','stress_level','interest_in_subject'];
                const disabled = role === 'student' && !STUDENT_ALLOWED.includes(field.key);
                return (
                  <div key={field.key} className={`input-group ${disabled?'field-disabled':''}`}>
                    <div className="label-row">
                      <label className="input-label">{field.label}</label>
                      {field.type==='range' && (
                        <span className="range-val" style={{color}}>
                          {parseFloat(val).toFixed(field.step<1?1:0)}{field.unit}
                        </span>
                      )}
                      {disabled && <span className="locked-tag">🔒 Read-only</span>}
                    </div>
                    {field.type==='text' ? (
                      <input className="input-field" type="text" placeholder={field.placeholder}
                        value={val} onChange={e => handleChange(field.key, e.target.value)} />
                    ) : (
                      <input type="range" min={field.min} max={field.max} step={field.step}
                        value={val} disabled={disabled}
                        onChange={e => handleChange(field.key, e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="submit-row">
          <button className="btn btn-primary submit-btn" onClick={handleSubmit} disabled={loading}>
            {loading
              ? <><span className="spinner"/>Saving to Excel...</>
              : `◈ ${isUpdate ? 'Update' : 'Save'} & Predict Risk`
            }
          </button>
          <p className="submit-note">
            Data will be saved to <strong>acadwatch_data.xlsx</strong> and today's entry logged in the Daily Log sheet.
          </p>
        </div>
      </div>
    </div>
  );
}
