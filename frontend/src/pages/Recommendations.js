import React, { useState, useEffect } from 'react';
import './Recommendations.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '');

export default function Recommendations() {
  const [recs, setRecs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');
  const [updating, setUpdating] = useState({});

  const load = () => {
    fetch(`${API}/recommendations`)
      .then(r => r.json())
      .then(d => setRecs(Array.isArray(d) ? d : []))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (rec, status) => {
    const key = `${rec.student_id}-${rec.category}-${rec.date}`;
    setUpdating(prev => ({...prev, [key]:true}));
    try {
      await fetch(`${API}/recommendations/status`, {
        method:'PUT', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({student_id: rec.student_id, category: rec.category, status, updated_by:'teacher'})
      });
      await load();
    } finally {
      setUpdating(prev => ({...prev, [key]:false}));
    }
  };

  const filtered = recs.filter(r => {
    if (filter === 'pending') return r.status === 'Pending';
    if (filter === 'done')    return r.status === 'Done';
    return true;
  });

  // Group by student
  const grouped = filtered.reduce((acc, r) => {
    const key = r.student_id;
    if (!acc[key]) acc[key] = { name: r.name, student_id: r.student_id, items: [] };
    acc[key].items.push(r);
    return acc;
  }, {});

  const pending = recs.filter(r => r.status === 'Pending').length;
  const done    = recs.filter(r => r.status === 'Done').length;

  return (
    <div className="recs-page">
      <div className="page-header fade-in">
        <div>
          <h1 className="page-title">Recommendations</h1>
          <p className="page-subtitle">{pending} pending · {done} completed</p>
        </div>
      </div>

      <div className="rec-summary fade-in-1">
        <div className="rec-stat pending-stat">
          <div className="rs-val">{pending}</div>
          <div className="rs-label">Pending</div>
        </div>
        <div className="rec-stat done-stat">
          <div className="rs-val">{done}</div>
          <div className="rs-label">Completed</div>
        </div>
        <div className="rec-stat total-stat">
          <div className="rs-val">{recs.length}</div>
          <div className="rs-label">Total</div>
        </div>
      </div>

      <div className="filter-bar fade-in-1">
        <div className="filter-tabs">
          {['all','pending','done'].map(f => (
            <button key={f} className={`filter-tab ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="load-center"><span className="spinner spinner-dark"/>Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="empty-recs">
          <div style={{fontSize:40}}>📋</div>
          <h3>No recommendations yet</h3>
          <p>Recommendations are generated automatically when a student is marked At-Risk.</p>
        </div>
      ) : (
        <div className="rec-groups fade-in-2">
          {Object.values(grouped).map(group => (
            <div key={group.student_id} className="rec-group card">
              <div className="group-header">
                <div className="group-avatar">{group.name.split(' ').map(n=>n[0]).join('')}</div>
                <div>
                  <div className="group-name">{group.name}</div>
                  <div className="group-id">{group.student_id} · {group.items.length} recommendations</div>
                </div>
                <span className={`badge ${group.items.some(i=>i.status==='Pending') ? 'badge-warning' : 'badge-success'}`}>
                  {group.items.filter(i=>i.status==='Pending').length} pending
                </span>
              </div>

              <div className="rec-items">
                {group.items.map((rec, i) => {
                  const key = `${rec.student_id}-${rec.category}-${rec.date}`;
                  const done = rec.status === 'Done';
                  return (
                    <div key={i} className={`rec-item ${done?'rec-done':''}`}>
                      <div className="rec-check">
                        {done ? '✓' : '○'}
                      </div>
                      <div className="rec-body">
                        <div className="rec-category-tag">{rec.category}</div>
                        <div className="rec-action">{rec.recommendation}</div>
                        <div className="rec-meta">{rec.date} · by {rec.updated_by}</div>
                      </div>
                      <div className="rec-actions">
                        {!done ? (
                          <button
                            className="btn btn-success"
                            style={{fontSize:11,padding:'4px 10px'}}
                            disabled={updating[key]}
                            onClick={() => updateStatus(rec, 'Done')}
                          >
                            {updating[key] ? '...' : '✓ Mark Done'}
                          </button>
                        ) : (
                          <button
                            className="btn btn-ghost"
                            style={{fontSize:11,padding:'4px 10px'}}
                            disabled={updating[key]}
                            onClick={() => updateStatus(rec, 'Pending')}
                          >
                            ↩ Undo
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
