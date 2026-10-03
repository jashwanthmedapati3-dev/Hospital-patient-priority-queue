import { useState, useEffect } from 'react'
import { History, RefreshCw } from 'lucide-react'
import api from '../utils/api.js'
import { getEventBadgeClass, formatTimestamp, formatDate } from '../utils/helpers.js'

const EVENT_TYPES = [
  '', 'PATIENT_REGISTERED', 'ADDED_TO_QUEUE', 'PRIORITY_UPDATED',
  'EMERGENCY_ESCALATED', 'PATIENT_TREATED', 'PATIENT_COMPLETED', 'PATIENT_CANCELLED',
]

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [patientFilter, setPatientFilter] = useState('')

  const fetchHistory = async () => {
    try {
      const params = {}
      if (filter) params.event_type = filter
      if (patientFilter) params.patient_id = patientFilter
      const res = await api.get('/history', { params })
      setHistory(res.data.history || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHistory() }, [filter, patientFilter])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            Queue History & Audit Trail
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Complete log of all queue events
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchHistory}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="history-filters">
        {EVENT_TYPES.map((type) => (
          <button
            key={type || 'ALL'}
            className={`filter-chip ${filter === type ? 'active' : ''}`}
            onClick={() => setFilter(type)}
          >
            {type || 'All Events'}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          className="form-input"
          placeholder="Filter by Patient ID (e.g., P-A1B2C3D4)..."
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* History Table */}
      <div className="glass-card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="page-loading" style={{ minHeight: 200 }}>
              <div className="spinner" />
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              <History size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p>No events found</p>
            </div>
          ) : (
            <div className="queue-table-container">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event Type</th>
                    <th>Patient ID</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((event, i) => (
                    <tr key={i}>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{formatTimestamp(event.timestamp)}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {formatDate(event.timestamp)}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`event-type-badge ${getEventBadgeClass(event.event_type)}`}>
                          {event.event_type}
                        </span>
                      </td>
                      <td>
                        <code style={{
                          fontFamily: 'monospace', fontSize: 'var(--font-size-xs)',
                          background: 'var(--bg-input)', padding: '2px 8px',
                          borderRadius: 4,
                        }}>
                          {event.patient_id}
                        </code>
                      </td>
                      <td style={{
                        fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)',
                        maxWidth: 400,
                      }}>
                        {event.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
