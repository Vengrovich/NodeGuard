import React, { useState } from 'react'
import { useStore } from '../store'
import axios from 'axios'
import { X, CheckCircle, XCircle, Loader } from 'lucide-react'

export default function ServerModal({ server, onClose }) {
  const { addServer, updateServer, deleteServer } = useStore()
  const isEdit = !!server

  const [form, setForm] = useState({
    name: server?.name || '',
    host: server?.host || '',
    useCustomPort: server?.port && server.port !== 22 ? true : false,
    port: server?.port || 22,
    username: server?.username || 'root',
    auth_type: server?.auth_type || 'password',
    password: '',
    private_key: '',
    passphrase: '',
  })
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleTest() {
    if (!isEdit) return
    setTesting(true); setTestResult(null)
    try {
      const { data } = await axios.post(`/api/servers/${server.id}/test`)
      setTestResult({ ok: true, message: data.message })
    } catch (err) {
      setTestResult({ ok: false, message: err.response?.data?.message || err.message })
    } finally { setTesting(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError('')
    const payload = {
      ...form,
      port: form.useCustomPort ? form.port : 22,
    }
    try {
      isEdit ? await updateServer(server.id, payload) : await addServer(payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally { setLoading(false) }
  }

  async function handleDelete() {
    if (!confirm(`Удалить сервер "${server.name}"?`)) return
    await deleteServer(server.id); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <span className="text-sm font-mono tracking-wider">{isEdit ? 'РЕДАКТИРОВАТЬ' : 'ДОБАВИТЬ СЕРВЕР'}</span>
          <button onClick={onClose} className="text-muted hover:text-white"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Field label="НАЗВАНИЕ">
            <input className={inp} value={form.name} onChange={e => upd('name', e.target.value)} required placeholder="VPS-Oslo" />
          </Field>

          <Field label="ХОСТ / IP">
            <input className={inp} value={form.host} onChange={e => upd('host', e.target.value)} required placeholder="109.248.42.138" />
          </Field>

          {/* Port with checkbox */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <label className="text-muted text-xs tracking-widest">ПОРТ</label>
              <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.useCustomPort}
                  onChange={e => upd('useCustomPort', e.target.checked)}
                  className="accent-blue w-3 h-3"
                />
                <span className="text-xs text-muted">Нестандартный порт</span>
              </label>
            </div>
            {form.useCustomPort ? (
              <input
                className={inp}
                type="number"
                value={form.port}
                onChange={e => upd('port', +e.target.value)}
                placeholder="22"
                min={1} max={65535}
              />
            ) : (
              <div className="px-3 py-1.5 bg-bg-primary border border-border-default rounded text-muted text-sm font-mono">
                22 (стандартный SSH)
              </div>
            )}
          </div>

          <Field label="ПОЛЬЗОВАТЕЛЬ">
            <input className={inp} value={form.username} onChange={e => upd('username', e.target.value)} required />
          </Field>

          <Field label="АУТЕНТИФИКАЦИЯ">
            <div className="flex gap-2">
              {['password', 'key'].map(t => (
                <button key={t} type="button" onClick={() => upd('auth_type', t)}
                  className={`flex-1 py-1.5 text-xs font-mono rounded border transition-colors
                    ${form.auth_type === t ? 'bg-blue/10 border-blue/40 text-blue' : 'bg-bg-primary border-border-default text-muted hover:text-white'}`}>
                  {t === 'password' ? '🔑 Пароль' : '🗝 SSH ключ'}
                </button>
              ))}
            </div>
          </Field>

          {form.auth_type === 'password' ? (
            <Field label="ПАРОЛЬ">
              <input className={inp} type="password" value={form.password} onChange={e => upd('password', e.target.value)}
                placeholder={isEdit ? '(оставьте пустым чтобы не менять)' : ''} />
            </Field>
          ) : (
            <>
              <Field label="ПРИВАТНЫЙ КЛЮЧ">
                <textarea className={`${inp} h-28 resize-none`} value={form.private_key}
                  onChange={e => upd('private_key', e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;..." />
              </Field>
              <Field label="PASSPHRASE (если есть)">
                <input className={inp} type="password" value={form.passphrase} onChange={e => upd('passphrase', e.target.value)} />
              </Field>
            </>
          )}

          {error && <div className="text-red text-xs border border-red/30 bg-red/10 rounded px-3 py-2">{error}</div>}
          {testResult && (
            <div className={`flex items-center gap-2 text-xs rounded px-3 py-2 border
              ${testResult.ok ? 'text-green border-green/30 bg-green/10' : 'text-red border-red/30 bg-red/10'}`}>
              {testResult.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
              {testResult.message}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {isEdit && (
              <button type="button" onClick={handleTest} disabled={testing}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono bg-bg-primary border border-border-default rounded hover:border-border-hover text-muted hover:text-white transition-colors disabled:opacity-50">
                {testing && <Loader size={12} className="animate-spin" />} ТЕСТ
              </button>
            )}
            {isEdit && (
              <button type="button" onClick={handleDelete}
                className="px-3 py-2 text-xs font-mono border border-red/30 bg-red/10 text-red rounded hover:bg-red/20 transition-colors">
                УДАЛИТЬ
              </button>
            )}
            <button type="submit" disabled={loading}
              className="ml-auto px-4 py-2 text-xs font-mono bg-green/10 hover:bg-green/20 border border-green/40 text-green rounded transition-colors disabled:opacity-50">
              {loading ? 'СОХРАНЕНИЕ...' : isEdit ? 'СОХРАНИТЬ' : 'ДОБАВИТЬ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inp = 'w-full bg-bg-primary border border-border-default rounded px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-blue'
function Field({ label, children }) {
  return <div><label className="block text-muted text-xs tracking-widest mb-1.5">{label}</label>{children}</div>
}
