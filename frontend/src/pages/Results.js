import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import './Results.css';

export default function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const { result } = location.state || {};

  if (!result) return (
    <div className="results-empty">
      <h2>No prediction result</h2>
      <button className="btn btn-accent" onClick={() => navigate('/add')}>← Go Back</button>
    </div>
  );

  const isAtRisk = result.risk_label === 'At Risk';
  const riskPct  = Math.round(result.risk_probability * 100);
  const pieData  = [
    { name:'Risk',  value: riskPct,      color: isAtRisk ? '#dc2626' : '#d1d5db' },
    { name:'Safe',  value: 100-riskPct,  color: '#059669' },
  ];

  return (
    <div className="results-page">
      <div className="results-top fade-in">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <div>
          <h1 className="page-title">Prediction Result</h1>
          <p className="page-subtitle">{result.name} · {result.student_id} · Saved to Excel ✓</p>
        </div>
      </div>

      {/* Risk Banner */}
      <div className={`risk-banner fade-in ${isAtRisk?'banner-danger':'banner-success'}`}>
        <div className="banner-left">
          <div className="banner-indicator" style={{background: isAtRisk?'var(--danger)':'var(--success)'}} />
          <div>
            <div className="banner-label">{isAtRisk ? '⚠ At Risk' : '✓ On Track'}</div>
            <div className="banner-sub">
              {isAtRisk
                ? `${riskPct}% probability of academic failure — intervention recommended`
                : `Student is performing well — keep monitoring`}
            </div>
            {result.changed_from && result.changed_from !== result.risk_label && (
              <div className="banner-change">
                Status changed: <strong>{result.changed_from}</strong> → <strong>{result.risk_label}</strong>
              </div>
            )}
          </div>
        </div>
        <div className="banner-score">{result.risk_score}<span>/100</span></div>
      </div>

      <div className="results-grid fade-in-1">
        {/* Gauge */}
        <div className="card gauge-card">
          <h3 className="card-title">Risk Probability</h3>
          <div style={{position:'relative'}}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="70%" startAngle={180} endAngle={0}
                  innerRadius={60} outerRadius={78} dataKey="value" strokeWidth={0}>
                  {pieData.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="gauge-center">
              <span className="gauge-num" style={{color:isAtRisk?'var(--danger)':'var(--success)'}}>{riskPct}%</span>
              <span className="gauge-sub">Risk</span>
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        <div className="card">
          <h3 className="card-title">Top Risk Factors</h3>
          {!result.top_risk_factors?.length ? (
            <div className="no-factors">🌟 No critical risk factors identified</div>
          ) : (
            <div className="factors-list">
              {result.top_risk_factors.map((f,i) => (
                <div key={i} className={`factor-row sev-${f.severity}`}>
                  <div className="factor-bar" />
                  <div className="factor-info">
                    <span className="factor-name">{f.factor}</span>
                    <span className="factor-val">{f.value}</span>
                  </div>
                  <span className={`badge badge-${f.severity==='high'?'danger':'warning'}`}>{f.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ML Model Comparison */}
      {(result.rf_label || result.lr_label || result.knn_label) && (
        <div className="card fade-in-1">
          <h3 className="card-title">
            🤖 ML Model Predictions
            <span className="card-note">
              Ensemble: <strong style={{color: result.ensemble_label==='At Risk'?'var(--danger)':'var(--success)'}}>
                {result.ensemble_label}
              </strong>
              &nbsp;· Agreement: <strong>{result.model_agreement}%</strong>
            </span>
          </h3>
          <div className="ml-models-grid">
            {[
              { name:'Random Forest', icon:'🌲', label: result.rf_label,  prob: result.rf_probability  },
              { name:'Logistic Regression', icon:'📈', label: result.lr_label,  prob: result.lr_probability  },
              { name:'K-Nearest Neighbors', icon:'🔵', label: result.knn_label, prob: result.knn_probability },
            ].map(m => {
              const isR = m.label === 'At Risk';
              return (
                <div key={m.name} className={`ml-model-card ${isR ? 'ml-risk' : 'ml-pass'}`}>
                  <div className="ml-model-icon">{m.icon}</div>
                  <div className="ml-model-name">{m.name}</div>
                  <div className={`ml-model-label ${isR ? 'label-risk' : 'label-pass'}`}>
                    {isR ? '⚠ At Risk' : '✓ Pass'}
                  </div>
                  <div className="ml-model-prob">
                    <div className="ml-prob-bar-track">
                      <div
                        className="ml-prob-bar-fill"
                        style={{
                          width: `${Math.round((m.prob||0)*100)}%`,
                          background: isR ? 'var(--danger)' : 'var(--success)'
                        }}
                      />
                    </div>
                    <span className="ml-prob-pct">{Math.round((m.prob||0)*100)}% risk prob.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {result.recommendations?.length > 0 && (
        <div className="card fade-in-2">
          <h3 className="card-title" style={{marginBottom:16}}>
            📋 Personalized Recommendations
            <span className="card-note">Saved to Excel → Recommendations sheet</span>
          </h3>
          <div className="recs-grid">
            {result.recommendations.map((rec,i) => (
              <div key={i} className="rec-card">
                <div className="rc-head">
                  <span className="rc-icon">{rec.icon}</span>
                  <div>
                    <div className="rc-title">{rec.title}</div>
                    <div className="rc-cat">{rec.category}</div>
                  </div>
                </div>
                <ul className="rc-actions">
                  {rec.actions.map((a,j) => <li key={j}>{a}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="results-actions fade-in-3">
        <button className="btn btn-primary" onClick={() => navigate('/add')}>＋ Update Another Student</button>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>Back to Dashboard</button>
        <button className="btn btn-ghost" onClick={() => navigate('/recommendations')}>View All Recommendations</button>
      </div>
    </div>
  );
}
