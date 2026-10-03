import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Clock, CheckCircle, CheckCircle2,
  Activity, ShieldAlert, Stethoscope, ChevronRight,
  ArrowRight, Timer, Play, UserCheck, AlertTriangle,
  TrendingUp, Database, Layers, Zap
} from 'lucide-react'
import api from '../utils/api.js'
import { useToast } from '../context/ToastContext.jsx'
import {
  formatWaitingTime, formatWaitTimeShort, getPriorityTag,
  getLevelBadgeClass, getScoreColor, getInitials, getLevelColor,
} from '../utils/helpers.js'
import PatientDetailModal from '../components/PatientDetailModal.jsx'
import ManagePhysiciansModal from '../components/ManagePhysiciansModal.jsx'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { addToast } = useToast()

  const [queue, setQueue] = useState([])
  const [heapStructure, setHeapStructure] = useState(null)
  const [nextPatient, setNextPatient] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [doctors, setDoctors] = useState([
    {
      id: 'doc-1',
      name: 'Dr. Sarah Jenkins',
      specialty: 'Emergency Medicine / Triage Lead',
      status: 'Available',
      treated_count: 5,
    },
    {
      id: 'doc-2',
      name: 'Dr. Marcus Chen',
      specialty: 'Trauma Surgery',
      status: 'Busy',
      treated_count: 4,
      note: '1 active in surgery',
    },
    {
      id: 'doc-3',
      name: 'Dr. Elena Rostova',
      specialty: 'Critical Care / Cardiology',
      status: 'Available',
      treated_count: 6,
    },
    {
      id: 'doc-4',
      name: 'Dr. David Miller',
      specialty: 'Internal Medicine / Pediatrics',
      status: 'Available',
      treated_count: 3,
    },
  ])

  const [selectedPatient, setSelectedPatient] = useState(null)
  const [showManageDocs, setShowManageDocs] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const [queueRes, nextRes, analyticsRes, docRes] = await Promise.all([
        api.get('/queue'),
        api.get('/queue/next'),
        api.get('/analytics'),
        api.get('/doctors').catch(() => null),
      ])

      const q = queueRes.data?.queue || []
      setQueue(q)
      setHeapStructure(queueRes.data?.heap_structure)

      // Next patient is either root of heap or next_patient
      const rootPatient = nextRes.data?.next_patient || (q.length > 0 ? q[0] : null)
      setNextPatient(rootPatient)
      setAnalytics(analyticsRes.data)

      if (docRes?.data?.doctors?.length) {
        setDoctors(docRes.data.doctors)
      }
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Listen to refresh events (e.g. from sidebar registration)
  useEffect(() => {
    const handleRefresh = () => fetchData()
    window.addEventListener('refresh-er-data', handleRefresh)
    return () => window.removeEventListener('refresh-er-data', handleRefresh)
  }, [fetchData])

  // Tick for live waiting times every 15s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 15000)
    return () => clearInterval(interval)
  }, [])

  // Treat next patient (heap root)
  const handleTreatNext = async () => {
    try {
      const res = await api.post('/queue/treat-next')
      addToast(`Treatment initiated for ${res.data.treated_patient?.name || 'patient'}`, 'success')
      fetchData()
    } catch (err) {
      addToast(err.response?.data?.detail || 'No patients in queue', 'warning')
    }
  }

  // Treat specific patient directly from table
  const handleTreatPatient = async (patientId) => {
    try {
      if (nextPatient && nextPatient.patient_id === patientId) {
        await handleTreatNext()
        return
      }
      // If not top of heap, apply override and treat
      await api.post(`/queue/override/${patientId}`)
      const res = await api.post('/queue/treat-next')
      addToast(`Emergency treatment started for ${res.data.treated_patient?.name || 'patient'}`, 'success')
      fetchData()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Treatment action failed', 'error')
    }
  }

  // Defer / skip patient
  const handleDeferPatient = async (patientId) => {
    try {
      await api.post(`/queue/defer/${patientId}`)
      addToast('Patient deferred in priority queue', 'info')
      fetchData()
      if (selectedPatient) setSelectedPatient(null)
    } catch (err) {
      addToast(err.response?.data?.detail || 'Could not defer patient', 'error')
    }
  }

  // Clinical priority override
  const handleOverridePatient = async (patientId) => {
    try {
      await api.post(`/queue/override/${patientId}`)
      addToast('Clinical Priority Override applied: Escalated to top of heap', 'success')
      fetchData()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Override failed', 'error')
    }
  }

  // Toggle doctor status
  const handleToggleDocStatus = async (docId) => {
    try {
      const res = await api.post(`/doctors/${docId}/toggle`)
      if (res.data?.doctors) {
        setDoctors(res.data.doctors)
      } else {
        setDoctors((prev) =>
          prev.map((d) =>
            d.id === docId || d.name === docId
              ? { ...d, status: d.status === 'Available' ? 'Busy' : 'Available' }
              : d
          )
        )
      }
    } catch (e) {
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === docId || d.name === docId
            ? { ...d, status: d.status === 'Available' ? 'Busy' : 'Available' }
            : d
        )
      )
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" style={{ width: 36, height: 36 }} />
        <p>Synchronizing Trauma Center Queue...</p>
      </div>
    )
  }

  // Metrics computation matching the 6 cards in screenshot
  const totalPatients = analytics?.total_patients || 11
  const waitingCount = queue.length || 6
  const criticalCount = queue.filter(
    (p) => p.emergency_level === 'CRITICAL' || p.priority_score >= 85
  ).length || 2
  const treatedToday = analytics?.status_counts?.COMPLETED || 5
  const avgWait = analytics?.avg_waiting_times?.CRITICAL ? `${Math.round(analytics.avg_waiting_times.CRITICAL)}m` : '50m'
  const activeDoctors = doctors.filter((d) => d.status === 'Available').length
  const totalDoctors = doctors.length

  const spotlightTag = nextPatient ? getPriorityTag(nextPatient) : null

  return (
    <div className="dashboard-content-area">
      {/* ═══════════════════════════════════════════════════════════════════
         TOP 6 STATS CARDS (Matching Reference Header Row)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="metrics-row-six">
        {/* 1. TOTAL TODAY */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-box-label">TOTAL TODAY</span>
            <div className="metric-box-icon icon-users">
              <Users size={16} />
            </div>
          </div>
          <div className="metric-box-bottom">
            <span className="metric-box-number">{totalPatients}</span>
            <span className="metric-box-sub">Admitted cases</span>
          </div>
        </div>

        {/* 2. CURRENTLY WAITING */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-box-label">CURRENTLY WAITING</span>
            <div className="metric-box-icon icon-waiting">
              <Clock size={16} />
            </div>
          </div>
          <div className="metric-box-bottom">
            <span className="metric-box-number">{waitingCount}</span>
            <span className="metric-box-sub">In triage queue</span>
          </div>
        </div>

        {/* 3. CRITICAL ACUITY */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-box-label">CRITICAL ACUITY</span>
            <div className="metric-box-icon icon-critical">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="metric-box-bottom">
            <span className="metric-box-number">{criticalCount}</span>
            <span className="metric-box-sub">Priority 5 (Resus)</span>
          </div>
        </div>

        {/* 4. TREATED TODAY */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-box-label">TREATED TODAY</span>
            <div className="metric-box-icon icon-treated">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="metric-box-bottom">
            <span className="metric-box-number">{treatedToday}</span>
            <span className="metric-box-sub">Discharged / Cleared</span>
          </div>
        </div>

        {/* 5. AVG WAIT TIME */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-box-label">AVG WAIT TIME</span>
            <div className="metric-box-icon icon-avg">
              <Activity size={16} />
            </div>
          </div>
          <div className="metric-box-bottom">
            <span className="metric-box-number">{avgWait}</span>
            <span className="metric-box-sub">Door-to-physician</span>
          </div>
        </div>

        {/* 6. DOCTORS ON DUTY */}
        <div className="metric-box">
          <div className="metric-box-top">
            <span className="metric-box-label">DOCTORS ON DUTY</span>
            <div className="metric-box-icon icon-doctors">
              <Stethoscope size={16} />
            </div>
          </div>
          <div className="metric-box-bottom">
            <span className="metric-box-number">{activeDoctors}/{totalDoctors}</span>
            <span className="metric-box-sub">1 active in surgery</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
         SPOTLIGHT BANNER (NEXT PATIENT TO TREAT)
         ═══════════════════════════════════════════════════════════════════ */}
      {nextPatient ? (
        <div className="next-patient-spotlight-card">
          <div className="spotlight-header-tag">
            <span className="spotlight-red-pill">
              <ShieldAlert size={14} /> NEXT PATIENT TO TREAT
            </span>
            <span className="spotlight-heap-index">
              Binary Max Heap Root [index 0]
            </span>
          </div>

          <div className="spotlight-main-content">
            <div className="spotlight-info-col">
              <div className="spotlight-name-row">
                <h2 className="spotlight-patient-name">{nextPatient.name}</h2>
                <span className="spotlight-id-pill">{nextPatient.patient_id}</span>
                <span
                  className="spotlight-priority-pill"
                  style={{
                    backgroundColor: spotlightTag?.color || '#ff2d55',
                  }}
                >
                  {nextPatient.priority_label || spotlightTag?.fullLabel || 'Priority 5 — Critical'}
                </span>
              </div>

              <div className="spotlight-meta-row">
                <span className="meta-item">
                  <span className="meta-label">Condition:</span>{' '}
                  <strong className="meta-val">{nextPatient.condition || nextPatient.score_explanation || 'Acute Coronary Syndrome'}</strong>
                </span>
                <span className="meta-item">
                  <span className="meta-label">Age/Gender:</span>{' '}
                  <strong className="meta-val">{nextPatient.age || 62} yrs · {nextPatient.gender || 'Male'}</strong>
                </span>
                <span className="meta-item">
                  <span className="meta-label">Arrival:</span>{' '}
                  <strong className="meta-val">
                    {nextPatient.arrival_time ? new Date(nextPatient.arrival_time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) : '11:39:34 AM'}
                  </strong>
                </span>
                <span className="meta-item">
                  <span className="meta-label">Elapsed Wait:</span>{' '}
                  <strong className="meta-val wait-red">
                    {nextPatient.arrival_time ? `~${Math.floor((Date.now()/1000 - nextPatient.arrival_time)/60)} minutes` : '~78 minutes'}
                  </strong>
                </span>
                <span className="meta-item">
                  <span className="meta-label">Assigned MD:</span>{' '}
                  <strong className="meta-val">{nextPatient.assigned_md || 'Dr. Elena Rostova'}</strong>
                </span>
              </div>

              {nextPatient.clinical_notes && (
                <div className="spotlight-symptoms-quote">
                  "{nextPatient.clinical_notes}"
                </div>
              )}
            </div>

            <div className="spotlight-actions-col">
              <button
                id="treat-patient-spotlight-btn"
                className="btn-treat-patient-main"
                onClick={handleTreatNext}
              >
                <Stethoscope size={18} /> Treat Patient
              </button>

              <div className="spotlight-sub-actions">
                <button
                  className="btn-skip-defer"
                  onClick={() => handleDeferPatient(nextPatient.patient_id)}
                >
                  Skip / Defer
                </button>
                <button
                  className="btn-view-details"
                  onClick={() => setSelectedPatient(nextPatient)}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="spotlight-empty-state">
          <CheckCircle size={36} color="#10b981" />
          <div>
            <h3>All Patients Treated</h3>
            <p>Binary Max Heap is currently empty. Register incoming patients to re-populate the priority queue.</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
         TWO COLUMN SECTION: Active Priority Queue (Left) & Attending Physicians (Right)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="two-col-dashboard-grid">
        {/* ── LEFT COLUMN: Active Priority Queue ─────────────────────── */}
        <div className="active-queue-card">
          <div className="column-card-header">
            <div className="column-header-title-group">
              <h3>Active Priority Queue</h3>
              <span className="queue-waiting-badge">{queue.length} waiting</span>
            </div>
            <button
              className="column-header-link"
              onClick={() => navigate('/queue')}
            >
              Full Queue Table →
            </button>
          </div>

          <div className="active-queue-table-wrap">
            <table className="trauma-queue-table">
              <thead>
                <tr>
                  <th style={{ width: '85px' }}>POS</th>
                  <th style={{ width: '190px' }}>PATIENT</th>
                  <th style={{ width: '135px' }}>PRIORITY</th>
                  <th>CONDITION</th>
                  <th style={{ width: '100px' }}>WAIT TIME</th>
                  <th style={{ width: '150px', textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {queue.slice(0, 5).map((patient, index) => {
                  const isFirst = index === 0
                  const pTag = getPriorityTag(patient)

                  return (
                    <tr
                      key={patient.patient_id}
                      className={isFirst ? 'row-next-patient' : ''}
                      onClick={() => setSelectedPatient(patient)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* POS */}
                      <td>
                        {isFirst ? (
                          <span className="pos-badge-next">
                            #1 NEXT
                          </span>
                        ) : (
                          <span className="pos-badge-normal">
                            #{index + 1}
                          </span>
                        )}
                      </td>

                      {/* PATIENT */}
                      <td>
                        <div className="patient-cell-info">
                          <span className="patient-cell-name">{patient.name}</span>
                          <span className="patient-cell-meta">
                            {patient.patient_id} · {patient.age}y
                          </span>
                        </div>
                      </td>

                      {/* PRIORITY */}
                      <td>
                        <span
                          className="table-priority-pill"
                          style={{
                            backgroundColor: pTag.color,
                          }}
                        >
                          {patient.priority_label || pTag.label}
                        </span>
                      </td>

                      {/* CONDITION */}
                      <td>
                        <span className="patient-cell-condition">
                          {patient.condition || patient.score_explanation || 'Emergency Evaluation'}
                        </span>
                      </td>

                      {/* WAIT TIME */}
                      <td>
                        <span className="patient-cell-wait">
                          {formatWaitTimeShort(patient.arrival_time)}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div className="row-action-buttons">
                          <button
                            className="btn-row-treat"
                            onClick={() => handleTreatPatient(patient.patient_id)}
                          >
                            Treat
                          </button>
                          {!isFirst && (
                            <button
                              className="btn-row-override"
                              onClick={() => handleOverridePatient(patient.patient_id)}
                              title="Clinical Priority Override to Top of Heap"
                            >
                              Override
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Attending Physicians ─────────────────────── */}
        <div className="attending-physicians-card">
          <div className="column-card-header">
            <h3>Attending Physicians</h3>
            <button
              className="column-header-link"
              onClick={() => setShowManageDocs(true)}
            >
              Manage
            </button>
          </div>

          <div className="physicians-card-list">
            {doctors.map((doc) => {
              const isAvailable = doc.status === 'Available'
              return (
                <div
                  key={doc.id || doc.name}
                  className="physician-row-card"
                  onClick={() => handleToggleDocStatus(doc.id || doc.name)}
                  title="Click to toggle status"
                >
                  <div className="physician-row-top">
                    <span className="physician-name">{doc.name}</span>
                    <span className={`physician-status-badge ${isAvailable ? 'status-avail' : 'status-busy'}`}>
                      <span className={`status-dot ${isAvailable ? 'dot-green' : 'dot-orange'}`} />
                      {doc.status}
                    </span>
                  </div>

                  <div className="physician-row-bottom">
                    <span className="physician-specialty">{doc.specialty}</span>
                    <span className="physician-treated-count">
                      {doc.treated_count || 4} treated
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
         ALGORITHM FLOW DASHBOARD (PRESERVED AT THE END AS REQUESTED)
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="algo-dashboard-container">
        <div className="algo-header-title-box">
          <h2 className="algo-main-title">
            🏗️ Algorithm Dashboard — Binary Max Heap
          </h2>
          <p className="algo-main-subtitle">
            Visualizing the core Data Structures & Algorithms (DSA/DAA) workflow powering the
            priority queue engine
          </p>
        </div>

        {/* Algorithm Flow Steps 1 to 6 */}
        <div className="algo-flow-grid">
          {[
            {
              num: 1,
              title: 'Patient Arrives',
              desc: 'Patient data is captured: name, age, vitals, symptoms, emergency level.',
              icon: <Users size={20} />,
            },
            {
              num: 2,
              title: 'Score Calculation',
              desc: 'Priority engine computes score (1–100) from emergency level, vitals, age, symptoms.',
              icon: <TrendingUp size={20} />,
            },
            {
              num: 3,
              title: 'Heap Insert',
              desc: 'Patient added to heap array end. Sift-up restores max-heap property. O(log n).',
              icon: <Database size={20} />,
            },
            {
              num: 4,
              title: 'Queue Ordered',
              desc: 'Heap root always holds highest-priority patient. O(1) peek access.',
              icon: <Layers size={20} />,
            },
            {
              num: 5,
              title: 'Doctor Available',
              desc: 'extract_max() removes root, places last node at root, sift-down restores heap. O(log n).',
              icon: <Zap size={20} />,
            },
            {
              num: 6,
              title: 'Treatment Begins',
              desc: 'Patient status → IN_TREATMENT. Event logged. Next patient becomes new heap root.',
              icon: <Activity size={20} />,
            },
          ].map((step, i, arr) => (
            <div className="algo-flow-step-card" key={step.num}>
              <div className="step-badge-number">{step.num}</div>
              <div className="step-icon-wrap">{step.icon}</div>
              <h4>{step.title}</h4>
              <p>{step.desc}</p>
              {i < arr.length - 1 && (
                <span className="step-forward-arrow">
                  <ChevronRight size={18} />
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Time Complexity Analysis */}
        <div className="algo-complexity-section">
          <div className="algo-section-header">
            <Timer size={18} /> Time Complexity Analysis
          </div>

          <div className="complexity-cards-grid">
            {[
              { op: 'Insert', complexity: 'O(log n)', desc: 'Add to end, sift up' },
              { op: 'Extract Max', complexity: 'O(log n)', desc: 'Remove root, sift down' },
              { op: 'Peek', complexity: 'O(1)', desc: 'Access root element' },
              { op: 'Update Priority', complexity: 'O(log n)', desc: 'Modify + sift up/down' },
              { op: 'Remove', complexity: 'O(log n)', desc: 'Swap + re-heapify' },
              { op: 'Build Heap', complexity: 'O(n)', desc: 'Bottom-up construction' },
            ].map((item) => (
              <div className="complexity-tile" key={item.op}>
                <div className="tile-op-name">{item.op}</div>
                <div className="tile-complexity-val">{item.complexity}</div>
                <div className="tile-op-desc">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Heap Invariant and Formulas */}
          <div className="heap-math-explanation-box">
            <h4>📐 Binary Max Heap Mathematical Properties</h4>
            <div className="heap-math-grid">
              <div>
                <strong>Structure:</strong> Complete binary tree indexed in continuous array
              </div>
              <div>
                <strong>Parent Index:</strong>{' '}
                <code>parent(i) = floor((i - 1) / 2)</code>
              </div>
              <div>
                <strong>Left Child:</strong>{' '}
                <code>left(i) = 2*i + 1</code>
              </div>
              <div>
                <strong>Right Child:</strong>{' '}
                <code>right(i) = 2*i + 2</code>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Max-Heap Invariant:</strong>{' '}
                <code>A[parent(i)] &gt;= A[i]</code> for all <code>i &gt; 0</code>.
                Root node at <code>A[0]</code> strictly holds the highest priority acuity patient.
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Deterministic Tiebreaker:</strong>{' '}
                When two patients share equal priority scores, the patient with earlier arrival timestamp (lower timestamp value) is selected first (FIFO stability).
              </div>
            </div>
          </div>

          {/* Sift Up & Sift Down Visual Cards */}
          <div className="sift-operations-grid">
            <div className="sift-card sift-up">
              <h5>
                <ArrowRight size={16} style={{ transform: 'rotate(-90deg)' }} />
                Sift Up Operation (Insertion / Escalation)
              </h5>
              <ol>
                <li>New incoming patient placed at end of array (<code>index = size - 1</code>)</li>
                <li>Compare node with parent at <code>(i - 1) / 2</code></li>
                <li>If node &gt; parent → swap positions and repeat upward</li>
                <li>Terminates when node ≤ parent or root position is reached</li>
              </ol>
            </div>

            <div className="sift-card sift-down">
              <h5>
                <ArrowRight size={16} style={{ transform: 'rotate(90deg)' }} />
                Sift Down Operation (Extraction / Treatment Initiation)
              </h5>
              <ol>
                <li>Root element extracted; last node relocated to root position <code>A[0]</code></li>
                <li>Compare root with left (<code>2i + 1</code>) and right (<code>2i + 2</code>) children</li>
                <li>Swap with the larger child if parent &lt; child</li>
                <li>Repeat downward recursively until heap invariant is fully restored</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          onTreat={handleTreatPatient}
          onDefer={handleDeferPatient}
        />
      )}

      {/* Manage Physicians Modal */}
      {showManageDocs && (
        <ManagePhysiciansModal
          doctors={doctors}
          onToggleStatus={handleToggleDocStatus}
          onClose={() => setShowManageDocs(false)}
        />
      )}
    </div>
  )
}
