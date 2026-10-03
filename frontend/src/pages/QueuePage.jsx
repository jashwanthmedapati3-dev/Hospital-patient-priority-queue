import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Play, AlertTriangle, Clock, ArrowUpCircle,
  Trash2, Siren, RefreshCw, CheckCircle,
} from 'lucide-react'
import api from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import {
  formatWaitingTime, getLevelBadgeClass, getScoreColor,
  getInitials, getLevelColor,
} from '../utils/helpers.js'
import PatientModal from '../components/PatientModal.jsx'

export default function QueuePage() {
  const { addToast } = useToast()
  const [queue, setQueue] = useState([])
  const [nextPatient, setNextPatient] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const fetchQueue = useCallback(async () => {
    try {
      const [queueRes, nextRes] = await Promise.all([
        api.get('/queue'),
        api.get('/queue/next'),
      ])
      setQueue(queueRes.data.queue || [])
      setNextPatient(nextRes.data.next_patient)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchQueue() }, [fetchQueue])
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10000)
    return () => clearInterval(interval)
  }, [])

  const handleRegister = async (patient) => {
    try {
      const res = await api.post('/patients', patient)
      addToast(`${patient.name} registered — Score: ${res.data.patient.priority_score}`, 'success')
      setShowModal(false)
      fetchQueue()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Registration failed', 'error')
    }
  }

  const handleTreatNext = async () => {
    try {
      const res = await api.post('/queue/treat-next')
      addToast(`Treatment started for ${res.data.treated_patient.name}`, 'success')
      fetchQueue()
    } catch (err) {
      addToast(err.response?.data?.detail || 'No patients', 'warning')
    }
  }

  const handleEscalate = async (patientId) => {
    try {
      const res = await api.post(`/queue/escalate/${patientId}`, {
        new_level: 'CRITICAL',
        reason: 'Condition deteriorating',
      })
      addToast(
        `Escalated to CRITICAL — New score: ${res.data.new_score}`,
        'warning'
      )
      fetchQueue()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Escalation failed', 'error')
    }
  }

  const handleRemove = async (patientId) => {
    if (!confirm('Remove this patient from the queue?')) return
    try {
      await api.delete(`/queue/${patientId}`)
      addToast('Patient removed from queue', 'info')
      fetchQueue()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Remove failed', 'error')
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p>Loading queue...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            Emergency Queue
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Manage patient priority queue — {queue.length} patient(s) waiting
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={fetchQueue}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Register Patient
          </button>
        </div>
      </div>

      {/* Next Patient Spotlight */}
      {nextPatient ? (
        <div className="spotlight-banner">
          <div className="spotlight-left">
            <div className="spotlight-icon"><Siren size={26} /></div>
            <div className="spotlight-info">
              <h3>⚡ Next Patient to Treat</h3>
              <h2>{nextPatient.name}</h2>
              <div className="spotlight-meta">
                <span className={`badge ${getLevelBadgeClass(nextPatient.emergency_level)}`}>
                  {nextPatient.emergency_level}
                </span>
                <span><Clock size={14} /> {formatWaitingTime(nextPatient.arrival_time)}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {nextPatient.patient_id}
                </span>
              </div>
              <p style={{
                fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)',
                marginTop: 6, maxWidth: 500,
              }}>
                {nextPatient.score_explanation}
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="spotlight-score">
              {nextPatient.priority_score}
              <small>Priority Score</small>
            </div>
            <button className="btn btn-danger" style={{ marginTop: 12 }} onClick={handleTreatNext}>
              <Play size={16} /> Start Treatment
            </button>
          </div>
        </div>
      ) : (
        <div className="spotlight-banner" style={{ justifyContent: 'center' }}>
          <div className="spotlight-empty">
            <CheckCircle size={40} />
            <p style={{ fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Queue Empty</p>
          </div>
        </div>
      )}

      {/* Full Queue Table */}
      <div className="glass-card">
        <div className="card-header">
          <h3>Patient Queue — Sorted by Priority (Heap Order)</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {queue.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Siren size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No patients in the queue</p>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16 }}
                onClick={() => setShowModal(true)}
              >
                <Plus size={16} /> Register First Patient
              </button>
            </div>
          ) : (
            <div className="queue-table-container">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Position</th>
                    <th>Patient</th>
                    <th>Emergency Level</th>
                    <th>Priority Score</th>
                    <th>Waiting Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((patient, index) => (
                    <tr key={patient.patient_id}>
                      <td>
                        <div className={`queue-position ${index === 0 ? 'first' : ''}`}>
                          {index + 1}
                        </div>
                      </td>
                      <td>
                        <div className="patient-name-cell">
                          <div
                            className="patient-avatar"
                            style={{
                              background: `linear-gradient(135deg, ${getLevelColor(patient.emergency_level)}, ${getLevelColor(patient.emergency_level)}88)`,
                            }}
                          >
                            {getInitials(patient.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{patient.name}</div>
                            <div className="patient-id-text">{patient.patient_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getLevelBadgeClass(patient.emergency_level)}`}>
                          {patient.emergency_level}
                        </span>
                      </td>
                      <td>
                        <div className="score-bar">
                          <span className="score-value"
                            style={{ color: getScoreColor(patient.priority_score) }}>
                            {patient.priority_score}
                          </span>
                          <div className="score-bar-track">
                            <div
                              className="score-bar-fill"
                              style={{
                                width: `${patient.priority_score}%`,
                                background: getScoreColor(patient.priority_score),
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="waiting-time">
                          <Clock size={14} style={{ marginRight: 4 }} />
                          {formatWaitingTime(patient.arrival_time)}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-waiting">WAITING</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          {patient.emergency_level !== 'CRITICAL' && (
                            <button
                              className="btn btn-warning btn-sm"
                              title="Escalate to CRITICAL"
                              onClick={() => handleEscalate(patient.patient_id)}
                            >
                              <ArrowUpCircle size={14} />
                            </button>
                          )}
                          <button
                            className="btn btn-ghost btn-sm"
                            title="Remove from queue"
                            onClick={() => handleRemove(patient.patient_id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <PatientModal onClose={() => setShowModal(false)} onSubmit={handleRegister} />
      )}
    </div>
  )
}
