import React, { useState } from 'react'
import { X, Settings, Sliders, Bell, Cpu, Volume2, Shield } from 'lucide-react'
import { useToast } from '../context/ToastContext'

export default function SettingsModal({ onClose }) {
  const { addToast } = useToast()
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [audioAlerts, setAudioAlerts] = useState(true)
  const [heapSpeed, setHeapSpeed] = useState('500ms')
  const [traumaLevel, setTraumaLevel] = useState('Level I')

  const handleSave = () => {
    addToast('Trauma center configuration updated successfully', 'success')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-settings" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="modal-badge-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
              <Settings size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>System Settings</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Trauma Center Priority Engine Parameters
              </span>
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="setting-row">
            <div>
              <div className="setting-title"><Shield size={16} /> Trauma Accreditation Level</div>
              <div className="setting-desc">Sets emergency triage threshold multipliers and resus capacity</div>
            </div>
            <select
              className="form-input"
              style={{ width: 140 }}
              value={traumaLevel}
              onChange={(e) => setTraumaLevel(e.target.value)}
            >
              <option value="Level I">Trauma Level I</option>
              <option value="Level II">Trauma Level II</option>
              <option value="Level III">Trauma Level III</option>
            </select>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-title"><Cpu size={16} /> Max-Heap Sift Animation Speed</div>
              <div className="setting-desc">Visualization step delay during sift-up and sift-down operations</div>
            </div>
            <select
              className="form-input"
              style={{ width: 140 }}
              value={heapSpeed}
              onChange={(e) => setHeapSpeed(e.target.value)}
            >
              <option value="250ms">Fast (250ms)</option>
              <option value="500ms">Normal (500ms)</option>
              <option value="1000ms">Slow (1.0s)</option>
            </select>
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-title"><Bell size={16} /> Live Polling & Auto-Refresh</div>
              <div className="setting-desc">Continuously sync real-time queue arrival times and vitals updates</div>
            </div>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#3b82f6', cursor: 'pointer' }}
            />
          </div>

          <div className="setting-row">
            <div>
              <div className="setting-title"><Volume2 size={16} /> Audio Alert for Priority 5 (Resus)</div>
              <div className="setting-desc">Emit audible alert chime whenever a critical resuscitation patient arrives</div>
            </div>
            <input
              type="checkbox"
              checked={audioAlerts}
              onChange={(e) => setAudioAlerts(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#ef4444', cursor: 'pointer' }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
