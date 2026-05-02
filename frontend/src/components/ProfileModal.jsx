import React, { useState } from 'react'
import { useStore } from '../store'
import { X, Loader, CheckCircle, XCircle, User, Lock } from 'lucide-react'

export default function ProfileModal({ onClose }) {
  const { username, changePassword, changeUsername, logout } = useStore()
  const [tab, setTab] = useState('username') // 'username' | 'password'

  // Username form
  const [newUsername, setNewUsername] = useState(username)
  const [usernamePassword, setUsernamePassword] = useState('')

  // Password form
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { ok, message }

  async function handleChangeUsername(e) {
    e.preventDefault()
    if (!newUsername.trim()) return setResult({ ok: false, message: 'Введите имя пользователя' })
    if (!usernamePassword) return setResult({ ok: false, message: 'Введите текущий пароль' })
    setLoading(true); setResult(null)
    try {
      await changeUsername(newUsername.trim(), usernamePassword)
      setResult({ ok: true, message: 'Имя пользователя изменено!' })
      setUsernamePassword('')
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error || err.message })
    } finally { setLoading(false) }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) return setResult({ ok: false, message: 'Пароли не совпадают' })
    if (newPassword.length < 4) return setResult({ ok: false, message: 'Пароль слишком короткий' })
    setLoading(true); setResult(null)
    try {
      await changePassword(oldPassword, newPassword)
      setResult({ ok: true, message: 'Пароль успешно изменён!' })
      setOldPassword(''); setNewPassword(''); setConfirmPassword('')
    } catch (err) {
      setResult({ ok: false, message: err.response?.data?.error || err.message })
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <span className="text-sm font-mono tracking-wider">ПРОФИЛЬ</span>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={16} /></button>
        </div>

        {/* Current user info */}
        <div className="px-5 pt-4 pb-3 border-b border-border-default">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green/10 border border-green/30 flex items-center justify-center">
              <User size={16} className="text-green" />
            </div>
            <div>
              <div className="text-sm font-mono text-white">{username}</div>
              <div className="text-xs text-muted">Текущий пользователь</div>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border-default">
          {[
            { id: 'username', label: 'Изменить логин', Icon: User },
            { id: 'password', label: 'Изменить пароль', Icon: Lock },
          ].map(({ id, label, Icon }) => (
            <button key={id} onClick={() => { setTab(id); setResult(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-mono border-b-2 transition-colors
                ${tab === id ? 'text-blue border-blue' : 'text-muted border-transparent hover:text-white'}`}>
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'username' && (
            <form onSubmit={handleChangeUsername} className="space-y-3">
              <Field label="НОВЫЙ ЛОГИН">
                <input className={inp} value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
              </Field>
              <Field label="ТЕКУЩИЙ ПАРОЛЬ (для подтверждения)">
                <input className={inp} type="password" value={usernamePassword}
                  onChange={e => setUsernamePassword(e.target.value)} required />
              </Field>
              {result && <Feedback result={result} />}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue/10 hover:bg-blue/20 border border-blue/40 text-blue rounded text-xs font-mono transition-colors disabled:opacity-50">
                {loading && <Loader size={12} className="animate-spin" />}
                Сохранить логин
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <Field label="ТЕКУЩИЙ ПАРОЛЬ">
                <input className={inp} type="password" value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)} required />
              </Field>
              <Field label="НОВЫЙ ПАРОЛЬ">
                <input className={inp} type="password" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} required />
              </Field>
              <Field label="ПОВТОРИТЕ НОВЫЙ ПАРОЛЬ">
                <input className={inp} type="password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} required />
              </Field>
              {result && <Feedback result={result} />}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-green/10 hover:bg-green/20 border border-green/40 text-green rounded text-xs font-mono transition-colors disabled:opacity-50">
                {loading && <Loader size={12} className="animate-spin" />}
                Сохранить пароль
              </button>
            </form>
          )}

          <button onClick={() => { onClose(); logout() }}
            className="w-full mt-3 py-2 border border-red/30 bg-red/10 text-red rounded text-xs font-mono hover:bg-red/20 transition-colors">
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  )
}

const inp = 'w-full bg-bg-primary border border-border-default rounded px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-blue'
function Field({ label, children }) {
  return <div><label className="block text-muted text-xs tracking-widest mb-1.5">{label}</label>{children}</div>
}
function Feedback({ result }) {
  return (
    <div className={`flex items-center gap-2 text-xs rounded px-3 py-2 border
      ${result.ok ? 'text-green border-green/30 bg-green/10' : 'text-red border-red/30 bg-red/10'}`}>
      {result.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
      {result.message}
    </div>
  )
}
