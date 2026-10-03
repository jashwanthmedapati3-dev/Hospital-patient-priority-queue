import { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import { BarChart3, RefreshCw } from 'lucide-react'
import api from '../utils/api.js'

const LEVEL_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
}

const STATUS_COLORS = {
  WAITING: '#f59e0b',
  IN_TREATMENT: '#6366f1',
  COMPLETED: '#10b981',
  CANCELLED: '#64748b',
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/analytics')
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnalytics() }, [])

  if (loading || !data) {
    return (
      <div className="page-loading">
        <div className="spinner" style={{ width: 32, height: 32 }} />
        <p>Loading analytics...</p>
      </div>
    )
  }

  // Prepare chart data
  const levelData = Object.entries(data.level_counts || {}).map(([name, value]) => ({
    name,
    value,
    color: LEVEL_COLORS[name] || '#64748b',
  }))

  const statusData = Object.entries(data.status_counts || {}).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || '#64748b',
  }))

  const waitingData = Object.entries(data.avg_waiting_times || {}).map(([name, value]) => ({
    name,
    avg_minutes: value,
    fill: LEVEL_COLORS[name] || '#64748b',
  }))

  const hourlyData = Object.entries(data.hourly_volume || {})
    .map(([hour, count]) => ({ hour, count }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
            Analytics Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
            Real-time emergency department metrics — {data.total_patients || 0} total patients
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchAnalytics}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="charts-grid">
        {/* Patients by Emergency Level (Donut) */}
        <div className="chart-card">
          <h3>Patients by Emergency Level</h3>
          {levelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={levelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {levelData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: 'var(--glass-border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              No data yet
            </div>
          )}
        </div>

        {/* Queue Status Split (Donut) */}
        <div className="chart-card">
          <h3>Queue Status Distribution</h3>
          {statusData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: 'var(--glass-border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              No data yet
            </div>
          )}
        </div>

        {/* Average Waiting Time by Level (Bar) */}
        <div className="chart-card">
          <h3>Avg Waiting Time by Emergency Level (minutes)</h3>
          {waitingData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={waitingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: 'var(--glass-border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="avg_minutes" radius={[4, 4, 0, 0]}>
                  {waitingData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              No data yet
            </div>
          )}
        </div>

        {/* Hourly Patient Volume (Line) */}
        <div className="chart-card">
          <h3>Patient Arrivals per Hour</h3>
          {hourlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="hour" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: 'var(--glass-border)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', r: 5 }}
                  activeDot={{ r: 7, fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
              No data yet
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
