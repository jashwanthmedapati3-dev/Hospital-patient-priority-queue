import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'

const SYMPTOM_PRESETS = [
  'Chest pain', 'Difficulty breathing', 'Severe bleeding', 'Head trauma',
  'Seizure', 'Loss of consciousness', 'Stroke', 'Anaphylaxis',
  'Severe burn', 'Abdominal pain', 'Fracture', 'High fever',
  'Hemorrhage', 'Cardiac arrest', 'Unresponsive',
]

export default function PatientModal({ onClose, onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    emergency_level: 'MEDIUM',
    symptoms: [],
    vitals: {
      heart_rate: '',
      spo2: '',
      bp_systolic: '',
      bp_diastolic: '',
      temperature: '',
    },
  })
  const [customSymptom, setCustomSymptom] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }))
  const updateVital = (field, value) =>
    setForm((p) => ({ ...p, vitals: { ...p.vitals, [field]: value } }))

  const toggleSymptom = (s) => {
    setForm((p) => ({
      ...p,
      symptoms: p.symptoms.includes(s)
        ? p.symptoms.filter((x) => x !== s)
        : [...p.symptoms, s],
    }))
  }

  const addCustomSymptom = () => {
    if (customSymptom.trim() && !form.symptoms.includes(customSymptom.trim())) {
      setForm((p) => ({ ...p, symptoms: [...p.symptoms, customSymptom.trim()] }))
      setCustomSymptom('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.age) return
    setSubmitting(true)
    const payload = {
      ...form,
      age: parseInt(form.age) || 30,
      vitals: {
        heart_rate: parseInt(form.vitals.heart_rate) || 80,
        spo2: parseInt(form.vitals.spo2) || 98,
        bp_systolic: parseInt(form.vitals.bp_systolic) || 120,
        bp_diastolic: parseInt(form.vitals.bp_diastolic) || 80,
        temperature: parseFloat(form.vitals.temperature) || 37.0,
      },
    }
    await onSubmit(payload)
    setSubmitting(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={20} />
            Register New Patient
          </h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Basic Info */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Patient Name *</label>
                <input
                  id="patient-name"
                  className="form-input"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Age *</label>
                <input
                  id="patient-age"
                  type="number"
                  className="form-input"
                  placeholder="Age"
                  min="0"
                  max="150"
                  value={form.age}
                  onChange={(e) => update('age', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  id="patient-gender"
                  className="form-select"
                  value={form.gender}
                  onChange={(e) => update('gender', e.target.value)}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  id="patient-phone"
                  className="form-input"
                  placeholder="Phone number"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>
            </div>

            {/* Emergency Level */}
            <div className="form-group">
              <label className="form-label">Emergency Level</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`badge badge-${level.toLowerCase()} ${
                      form.emergency_level === level ? '' : ''
                    }`}
                    style={{
                      cursor: 'pointer',
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      opacity: form.emergency_level === level ? 1 : 0.4,
                      transform: form.emergency_level === level ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 150ms',
                    }}
                    onClick={() => update('emergency_level', level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Vitals */}
            <label className="form-label" style={{ marginTop: 8 }}>Vital Signs</label>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }}>
                  Heart Rate (bpm)
                </label>
                <input
                  id="vital-hr"
                  type="number"
                  className="form-input"
                  placeholder="80"
                  value={form.vitals.heart_rate}
                  onChange={(e) => updateVital('heart_rate', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }}>SpO2 (%)</label>
                <input
                  id="vital-spo2"
                  type="number"
                  className="form-input"
                  placeholder="98"
                  value={form.vitals.spo2}
                  onChange={(e) => updateVital('spo2', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }}>Temp (°C)</label>
                <input
                  id="vital-temp"
                  type="number"
                  step="0.1"
                  className="form-input"
                  placeholder="37.0"
                  value={form.vitals.temperature}
                  onChange={(e) => updateVital('temperature', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }}>
                  BP Systolic (mmHg)
                </label>
                <input
                  id="vital-bp-sys"
                  type="number"
                  className="form-input"
                  placeholder="120"
                  value={form.vitals.bp_systolic}
                  onChange={(e) => updateVital('bp_systolic', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.7rem' }}>
                  BP Diastolic (mmHg)
                </label>
                <input
                  id="vital-bp-dia"
                  type="number"
                  className="form-input"
                  placeholder="80"
                  value={form.vitals.bp_diastolic}
                  onChange={(e) => updateVital('bp_diastolic', e.target.value)}
                />
              </div>
            </div>

            {/* Symptoms */}
            <div className="form-group">
              <label className="form-label">Symptoms (click to select)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {SYMPTOM_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="filter-chip"
                    style={{
                      background: form.symptoms.includes(s) ? 'var(--accent-primary)' : undefined,
                      color: form.symptoms.includes(s) ? '#fff' : undefined,
                      borderColor: form.symptoms.includes(s) ? 'var(--accent-primary)' : undefined,
                    }}
                    onClick={() => toggleSymptom(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  className="form-input"
                  placeholder="Add custom symptom..."
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSymptom())}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={addCustomSymptom}>
                  Add
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              id="submit-patient"
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !form.name || !form.age}
            >
              {submitting ? <span className="spinner" /> : 'Register & Enqueue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
