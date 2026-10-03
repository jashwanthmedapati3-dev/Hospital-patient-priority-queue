import React from 'react'
import { X, Heart, Activity, AlertCircle, Clock, Stethoscope, User, ShieldAlert } from 'lucide-react'
import { formatWaitTimeShort, getPriorityTag, formatWaitingTime } from '../utils/helpers'

export default function PatientDetailModal({ patient, onClose, onTreat, onDefer }) {
  if (!patient) return null

  const pTag = getPriorityTag(patient)
  const vitals = patient.vitals || {}

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-detail" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="modal-badge-icon" style={{ background: pTag.bg, color: pTag.color, border: `1px solid ${pTag.border}` }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{patient.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span className="patient-id-tag">{patient.patient_id}</span>
                <span className="priority-pill" style={{ background: pTag.bg, color: pTag.color, border: `1px solid ${pTag.border}` }}>
                  {pTag.fullLabel || pTag.label}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Heap Score: <strong style={{ color: pTag.color }}>{patient.priority_score}</strong>
                </span>
              </div>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Key Clinical Vitals Banner */}
          <div className="detail-vitals-grid">
            <div className="detail-vital-card">
              <span className="vital-label"><Activity size={14} /> Heart Rate</span>
              <span className="vital-val">{vitals.heart_rate || '—'} <small>bpm</small></span>
            </div>
            <div className="detail-vital-card">
              <span className="vital-label"><Heart size={14} /> Blood Pressure</span>
              <span className="vital-val">{vitals.blood_pressure || (vitals.bp_systolic ? `${vitals.bp_systolic}/${vitals.bp_diastolic}` : '120/80')} <small>mmHg</small></span>
            </div>
            <div className="detail-vital-card">
              <span className="vital-label"><AlertCircle size={14} /> Oxygen (SpO2)</span>
              <span className="vital-val" style={{ color: (vitals.spo2 || 98) < 94 ? '#ef4444' : '#10b981' }}>
                {vitals.spo2 || 98}%
              </span>
            </div>
            <div className="detail-vital-card">
              <span className="vital-label"><Clock size={14} /> Temp</span>
              <span className="vital-val">{vitals.temperature || 37.0}°C</span>
            </div>
          </div>

          {/* Clinical Case Breakdown */}
          <div className="detail-section-box">
            <h4>Primary Diagnosis & Condition</h4>
            <p className="detail-condition-title">{patient.condition || patient.score_explanation || 'Emergency Triage Evaluation'}</p>
            {patient.clinical_notes && (
              <p className="detail-notes-italic">"{patient.clinical_notes}"</p>
            )}
          </div>

          {/* Demographic & Triage Meta */}
          <div className="detail-info-row">
            <div>
              <span className="meta-dim">Age / Gender:</span>
              <strong>{patient.age} yrs · {patient.gender || 'Unspecified'}</strong>
            </div>
            <div>
              <span className="meta-dim">Assigned Attending MD:</span>
              <strong style={{ color: '#38bdf8' }}>{patient.assigned_md || 'Dr. Elena Rostova'}</strong>
            </div>
            <div>
              <span className="meta-dim">Elapsed Waiting Time:</span>
              <strong style={{ color: '#f87171' }}>{formatWaitingTime(patient.arrival_time)} ({formatWaitTimeShort(patient.arrival_time)})</strong>
            </div>
          </div>

          {/* Heap Priority Logic Explanation */}
          <div className="detail-algo-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Binary Max Heap Priority Computation
              </span>
              <span className="code-pill">index: 0 (root)</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              {patient.score_explanation || `Calculated based on emergency level ${patient.emergency_level}, vital signs stability index, and patient wait time duration.`}
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {onDefer && (
              <button className="btn btn-secondary-dark" onClick={() => onDefer(patient.patient_id)}>
                Skip / Defer in Queue
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
            {onTreat && (
              <button className="btn btn-treat-lg" onClick={() => { onTreat(patient.patient_id); onClose(); }}>
                <Stethoscope size={16} /> Treat Patient Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
