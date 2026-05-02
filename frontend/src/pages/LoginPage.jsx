import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Terminal } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useStore(s => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 rounded-full bg-green flex items-center justify-center">
            <Terminal size={16} color="#0d1117" />
          </div>
          <span className="text-green font-mono text-xl font-medium tracking-widest">VPS DASHBOARD</span>
        </div>
        <form onSubmit={handleSubmit} className="bg-bg-secondary border border-border-default rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-muted text-xs tracking-widest mb-2">USERNAME</label>
            <input className={inp} value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-muted text-xs tracking-widest mb-2">PASSWORD</label>
            <input type="password" className={inp} value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="text-red text-xs border border-red/30 bg-red/10 rounded px-3 py-2">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-green/10 hover:bg-green/20 border border-green/40 text-green rounded px-4 py-2 text-sm font-mono transition-colors disabled:opacity-50">
            {loading ? 'CONNECTING...' : '→ LOGIN'}
          </button>
        </form>
        <p className="text-center text-muted text-xs mt-4">Default: admin / admin</p>
      </div>
    </div>
  )
}

const inp = 'w-full bg-bg-primary border border-border-default rounded px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-green'
