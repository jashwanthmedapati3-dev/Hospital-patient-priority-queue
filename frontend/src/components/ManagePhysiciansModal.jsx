import React from 'react'
import { X, UserCheck, Stethoscope, Activity, CheckCircle, Clock } from 'lucide-react'

export default function ManagePhysiciansModal({ doctors, onToggleStatus, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-manage-docs" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-badge-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
              <Stethoscope size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Attending Physicians on Duty</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Emergency Department Shift & Availability Roster
              </span>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="physicians-roster-list">
            {doctors.map((doc) => {
              const isAvailable = doc.status === 'Available'
              return (
                <div key={doc.id || doc.name} className="roster-doc-card">
                  <div className="roster-doc-left">
                    <div className="roster-avatar">
                      {doc.avatar || doc.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="roster-name">{doc.name}</div>
                      <div className="roster-spec">{doc.specialty}</div>
                      {doc.note && (
                        <div className="roster-note">{doc.note}</div>
                      )}
                    </div>
                  </div>

                  <div className="roster-doc-right">
                    <div className="roster-metrics">
                      <span className="roster-treated-badge">
                        <CheckCircle size={13} /> {doc.treated_count || doc.treated || 0} treated today
                      </span>
                    </div>

                    <button
                      className={`btn btn-sm ${isAvailable ? 'btn-status-available' : 'btn-status-busy'}`}
                      onClick={() => onToggleStatus(doc.id || doc.name)}
                      title="Click to toggle availability"
                    >
                      <span className={`status-indicator-dot ${isAvailable ? 'dot-available' : 'dot-busy'}`} />
                      {doc.status}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
