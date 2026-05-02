import React, { useState } from 'react'
import { useStore } from '../../store'
import { useSocket } from '../../hooks/useSocket'
import { Plus, Trash2, Loader, Power } from 'lucide-react'

export default function FirewallTab({ serverId }) {
  const metrics = useStore(s => s.metrics[serverId])
  const { execCommand, ufwAction } = useSocket()
  const [newRule, setNewRule] = useState({ port: '', proto: 'tcp', action: 'allow', from: '' })
  const [loading, setLoading] = useState(null)
  const [msg, setMsg] = useState(null)

  if (!metrics) return <div className="text-muted text-sm">Загрузка...</div>
  const rules = metrics.ufwRules || []

  // Determine UFW status from rules presence or a status string
  const ufwEnabled = rules.length > 0 || metrics.ufwStatus === 'active'

  async function toggleUfw() {
    const action = ufwEnabled ? 'ufw disable' : 'echo y | ufw enable'
    setLoading('toggle')
    const result = await execCommand(serverId, action)
    setMsg(result.error
      ? { error: result.error }
      : { ok: ufwEnabled ? 'UFW отключён' : 'UFW включён' })
    setLoading(null)
  }

  async function handleDelete(num) {
    setLoading(`del-${num}`)
    const result = await ufwAction(serverId, 'delete', num)
    setMsg(result.error ? { error: result.error } : { ok: `Правило #${num} удалено` })
    setLoading(null)
  }

  async function handleAdd(e) {
    e.preventDefault()
    setLoading('add')
    const ruleStr = newRule.from
      ? `from ${newRule.from} to any port ${newRule.port} proto ${newRule.proto}`
      : `${newRule.port}/${newRule.proto}`
    const result = await ufwAction(serverId, newRule.action, ruleStr)
    setMsg(result.error ? { error: result.error } : { ok: `Правило добавлено: ${newRule.action} ${ruleStr}` })
    if (!result.error) setNewRule({ port: '', proto: 'tcp', action: 'allow', from: '' })
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* UFW status toggle */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-muted tracking-widest mb-1">UFW FIREWALL</div>
          <div className={`text-sm font-mono font-medium ${ufwEnabled ? 'text-green' : 'text-red'}`}>
            {ufwEnabled ? '● ВКЛЮЧЁН' : '○ ОТКЛЮЧЁН'}
          </div>
        </div>
        <button
          onClick={toggleUfw}
          disabled={loading === 'toggle'}
          className={`flex items-center gap-2 px-4 py-2 rounded border text-xs font-mono transition-colors disabled:opacity-50
            ${ufwEnabled
              ? 'border-red/40 bg-red/10 text-red hover:bg-red/20'
              : 'border-green/40 bg-green/10 text-green hover:bg-green/20'}`}>
          {loading === 'toggle' ? <Loader size={13} className="animate-spin" /> : <Power size={13} />}
          {ufwEnabled ? 'Отключить UFW' : 'Включить UFW'}
        </button>
      </div>

      {/* Rules table */}
      <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 text-xs text-muted tracking-widest border-b border-border-default">ПРАВИЛА</div>
        <table className="w-full text-xs font-mono">
          <thead><tr className="text-muted tracking-wider bg-bg-tertiary">
            <Th>#</Th><Th>ПОРТ / ПРАВИЛО</Th><Th>ИСТОЧНИК</Th><Th>ДЕЙСТВИЕ</Th><Th></Th>
          </tr></thead>
          <tbody>
            {rules.length === 0 && (
              <tr><td colSpan={5} className="text-center text-muted py-8 text-xs">Нет правил</td></tr>
            )}
            {rules.map((r, i) => (
              <tr key={i} className="border-t border-border-default hover:bg-bg-tertiary">
                <Td muted>{r.num}</Td>
                <Td>{r.port}</Td>
                <Td muted>{r.from || 'Anywhere'}</Td>
                <Td>
                  <span className={`px-2 py-0.5 rounded border text-xs
                    ${r.action === 'ALLOW' ? 'text-green border-green/30 bg-green/10'
                    : r.action === 'DENY' ? 'text-red border-red/30 bg-red/10'
                    : 'text-amber border-amber/30 bg-amber/10'}`}>
                    {r.action}
                  </span>
                </Td>
                <Td>
                  <button onClick={() => handleDelete(r.num)} disabled={!!loading}
                    className="text-muted hover:text-red transition-colors disabled:opacity-50">
                    {loading === `del-${r.num}` ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add rule */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <div className="text-xs text-muted tracking-widest mb-3">ДОБАВИТЬ ПРАВИЛО</div>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div>
              <label className="block text-muted text-xs mb-1">ПОРТ</label>
              <input className={inp} placeholder="22 или 8000:9000" value={newRule.port}
                onChange={e => setNewRule(r => ({ ...r, port: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-muted text-xs mb-1">ПРОТОКОЛ</label>
              <select className={inp} value={newRule.proto} onChange={e => setNewRule(r => ({ ...r, proto: e.target.value }))}>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="any">ANY</option>
              </select>
            </div>
            <div>
              <label className="block text-muted text-xs mb-1">ДЕЙСТВИЕ</label>
              <select className={inp} value={newRule.action} onChange={e => setNewRule(r => ({ ...r, action: e.target.value }))}>
                <option value="allow">ALLOW</option>
                <option value="deny">DENY</option>
                <option value="reject">REJECT</option>
                <option value="limit">LIMIT</option>
              </select>
            </div>
            <div>
              <label className="block text-muted text-xs mb-1">ИСТОЧНИК (опц.)</label>
              <input className={inp} placeholder="192.168.1.0/24" value={newRule.from}
                onChange={e => setNewRule(r => ({ ...r, from: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={!!loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green/10 hover:bg-green/20 border border-green/40 text-green rounded text-xs font-mono transition-colors disabled:opacity-50">
              {loading === 'add' ? <Loader size={12} className="animate-spin" /> : <Plus size={12} />}
              ДОБАВИТЬ ПРАВИЛО
            </button>
            <div className="text-xs text-muted">Пример: 443/tcp ALLOW, 22/tcp LIMIT</div>
          </div>
        </form>
      </div>

      {msg && (
        <div className={`text-xs rounded px-3 py-2 border flex items-center justify-between
          ${msg.error ? 'text-red border-red/30 bg-red/10' : 'text-green border-green/30 bg-green/10'}`}>
          <span>{msg.error || msg.ok}</span>
          <button onClick={() => setMsg(null)} className="ml-3 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
    </div>
  )
}

const inp = 'bg-bg-primary border border-border-default rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue'
const Th = ({ children }) => <th className="text-left px-4 py-2">{children}</th>
const Td = ({ children, muted }) => <td className={`px-4 py-2.5 ${muted ? 'text-muted' : ''}`}>{children}</td>
