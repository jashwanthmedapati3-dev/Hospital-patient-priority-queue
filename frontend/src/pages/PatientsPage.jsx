import { useState, useEffect } from 'react'
import { Users, RefreshCw, Search } from 'lucide-react'
import api from '../utils/api.js'
import {
  getLevelBadgeClass, getStatusBadgeClass, getInitials,
  getLevelColor, formatWaitingTime,
} from '../utils/helpers.js'

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLevel, setFilterLevel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients')
      setPatients(res.data.patients || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [])

  const filtered = patients.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.patient_id.toLowerCase().includes(search.toLowerCase())) return false
    if (filterLevel && p.emergency_level !== filterLevel) return false
    if (filterStatus && p.status !== filterStatus) return false
    return true
  })

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p>Loading patients...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            All Patients
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            {patients.length} total patients registered
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchPatients}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={16} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            id="patient-search"
            className="form-input"
            placeholder="Search by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select
          className="form-select"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          style={{ width: 160 }}
        >
          <option value="">All Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select
          className="form-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ width: 160 }}
        >
          <option value="">All Status</option>
          <option value="WAITING">Waiting</option>
          <option value="IN_TREATMENT">In Treatment</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Patient Table */}
      <div className="glass-card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="queue-table-container">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Age / Gender</th>
                  <th>Emergency Level</th>
                  <th>Priority Score</th>
                  <th>Status</th>
                  <th>Score Explanation</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                      No patients found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.patient_id}>
                      <td>
                        <div className="patient-name-cell">
                          <div
                            className="patient-avatar"
                            style={{
                              background: `linear-gradient(135deg, ${getLevelColor(p.emergency_level)}, ${getLevelColor(p.emergency_level)}88)`,
                            }}
                          >
                            {getInitials(p.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div className="patient-id-text">{p.patient_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>{p.age} / {p.gender}</td>
                      <td>
                        <span className={`badge ${getLevelBadgeClass(p.emergency_level)}`}>
                          {p.emergency_level}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                          {p.priority_score}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{
                        fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)',
                        maxWidth: 300,
                      }}>
                        {p.score_explanation}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
