import { useState, useEffect } from 'react'
import { Binary, RefreshCw } from 'lucide-react'
import api from '../utils/api.js'
import HeapVisualizer from '../components/HeapVisualizer.jsx'

export default function HeapVisualizerPage() {
  const [heapStructure, setHeapStructure] = useState(null)
  const [operations, setOperations] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchHeap = async () => {
    try {
      const res = await api.get('/queue/heap-structure')
      setHeapStructure(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchHeap() }, [])

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p>Loading heap structure...</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            DSA Heap Visualizer
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Interactive Binary Max Heap — Array and Tree representation
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchHeap}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Heap Info Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card info">
          <div className="stat-icon info"><Binary size={22} /></div>
          <div className="stat-content">
            <div className="stat-label">Heap Size</div>
            <div className="stat-value">{heapStructure?.size || 0}</div>
          </div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon success"><Binary size={22} /></div>
          <div className="stat-content">
            <div className="stat-label">Tree Height</div>
            <div className="stat-value">
              {heapStructure?.size
                ? Math.ceil(Math.log2((heapStructure.size || 1) + 1))
                : 0}
            </div>
          </div>
        </div>
        <div className="stat-card critical">
          <div className="stat-icon critical"><Binary size={22} /></div>
          <div className="stat-content">
            <div className="stat-label">Max Score (Root)</div>
            <div className="stat-value">
              {heapStructure?.array?.[0]?.priority_score || '—'}
            </div>
          </div>
        </div>
        <div className="stat-card medium">
          <div className="stat-icon medium"><Binary size={22} /></div>
          <div className="stat-content">
            <div className="stat-label">Structure</div>
            <div className="stat-value" style={{ fontSize: 'var(--font-size-base)' }}>
              Max Heap
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualizer */}
      <div className="glass-card">
        <div className="card-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Binary size={18} /> Binary Max Heap Visualization
          </h3>
        </div>
        <div className="card-body">
          <HeapVisualizer heapStructure={heapStructure} operations={operations} />
        </div>
      </div>

      {/* Heap Properties */}
      <div className="glass-card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>Heap Array Contents</h3>
        </div>
        <div className="card-body">
          {heapStructure?.array?.length > 0 ? (
            <div className="queue-table-container">
              <table className="queue-table">
                <thead>
                  <tr>
                    <th>Index</th>
                    <th>Patient</th>
                    <th>Score</th>
                    <th>Level</th>
                    <th>Parent Idx</th>
                    <th>Left Child Idx</th>
                    <th>Right Child Idx</th>
                  </tr>
                </thead>
                <tbody>
                  {heapStructure.array.map((node, i) => {
                    const parent = i === 0 ? '—' : Math.floor((i - 1) / 2)
                    const left = 2 * i + 1 < heapStructure.size ? 2 * i + 1 : '—'
                    const right = 2 * i + 2 < heapStructure.size ? 2 * i + 2 : '—'
                    return (
                      <tr key={node.patient_id}>
                        <td>
                          <code style={{
                            fontFamily: 'monospace', fontWeight: 700,
                            color: i === 0 ? 'var(--level-critical)' : 'var(--text-primary)',
                          }}>
                            [{i}]
                          </code>
                        </td>
                        <td style={{ fontWeight: 600 }}>{node.name}</td>
                        <td style={{ fontWeight: 700 }}>{node.priority_score}</td>
                        <td>
                          <span className={`badge badge-${node.emergency_level.toLowerCase()}`}>
                            {node.emergency_level}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{parent}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{left}</td>
                        <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>{right}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
              Heap is empty
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
