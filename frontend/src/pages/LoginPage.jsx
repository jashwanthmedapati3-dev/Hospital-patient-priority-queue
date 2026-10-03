import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { Siren, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const { login, register, loading } = useAuth()
  const { addToast } = useToast()
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('Nurse')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      addToast('Please fill in all fields', 'warning')
      return
    }
    let result
    if (isRegister) {
      result = await register(username, password, role, fullName)
    } else {
      result = await login(username, password)
    }
    if (result.success) {
      addToast('Welcome to ER Queue System!', 'success')
    } else {
      addToast(result.error, 'error')
    }
  }

  const fillTestAccount = (u, p) => {
    setUsername(u)
    setPassword(p)
    setIsRegister(false)
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">
            <Siren size={28} />
          </div>
          <h1>ER Queue System</h1>
          <p>Hospital Emergency Department Priority Management</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              id="login-username"
              type="text"
              className="form-input"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  id="register-fullname"
                  type="text"
                  className="form-input"
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  id="register-role"
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="Doctor">Doctor</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)',
                  cursor: 'pointer', padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'none', border: 'none', color: 'var(--accent-primary)',
              cursor: 'pointer', fontFamily: 'var(--font-family)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>

        <div className="test-accounts">
          <h4>🧪 Test Accounts (Click to fill)</h4>
          <div className="test-accounts-grid">
            <button className="test-account-btn" onClick={() => fillTestAccount('admin', 'admin123')}>
              <strong>Admin</strong>
              admin / admin123
            </button>
            <button className="test-account-btn" onClick={() => fillTestAccount('doctor', 'doctor123')}>
              <strong>Doctor</strong>
              doctor / doctor123
            </button>
            <button className="test-account-btn" onClick={() => fillTestAccount('nurse', 'nurse123')}>
              <strong>Nurse</strong>
              nurse / nurse123
            </button>
            <button className="test-account-btn" onClick={() => fillTestAccount('reception', 'reception123')}>
              <strong>Receptionist</strong>
              reception / reception123
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
