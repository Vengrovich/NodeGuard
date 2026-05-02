import React, { useState } from 'react'
import { useStore } from '../../store'
import { useSocket } from '../../hooks/useSocket'
import { X, Loader, Shield, ShieldOff } from 'lucide-react'

function fmtBytes(b) {
  if (!b) return '—'
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB'
  return b + ' B'
}

function parsePort(addr) {
  // addr like *:22 or :::22 or 127.0.0.1:3000
  const parts = addr?.split(':') || []
  return parts[parts.length - 1] || addr
}

export default function NetworkTab({ serverId }) {
  const metrics = useStore(s => s.metrics[serverId])
  const { execCommand } = useSocket()
  const [selectedPort, setSelectedPort] = useState(null)
  const [log, setLog] = useState('')
  const [loading, setLoading] = useState(null)

  if (!metrics) return <div className="text-muted text-sm">Загрузка...</div>
  const { network, ports, wgPeers } = metrics

  async function runPortAction(action, portEntry) {
    const portNum = parsePort(portEntry.addr)
    const proto = portEntry.proto?.includes('tcp') ? 'tcp' : 'udp'
    let cmd = ''
    if (action === 'ufw_allow') cmd = `ufw allow ${portNum}/${proto} && echo "OK: port ${portNum}/${proto} allowed"`
    else if (action === 'ufw_deny') cmd = `ufw deny ${portNum}/${proto} && echo "OK: port ${portNum}/${proto} denied"`
    else if (action === 'kill') cmd = `fuser -k ${portNum}/${proto} 2>&1 || echo "No process found on ${portNum}"`
    else if (action === 'info') cmd = `ss -tlunp | grep :${portNum} ; echo "---" ; fuser ${portNum}/${proto} 2>/dev/null | xargs -I{} cat /proc/{}/status 2>/dev/null | grep -E "Name|Pid" | head -4`

    setLoading(action)
    const result = await execCommand(serverId, cmd)
    setLog((result.stdout || '') + (result.stderr || '') + (result.error ? `ERROR: ${result.error}` : ''))
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {/* Interfaces */}
      <Card title="СЕТЕВЫЕ ИНТЕРФЕЙСЫ">
        <table className="w-full text-xs font-mono">
          <thead><tr className="text-muted tracking-wider bg-bg-tertiary">
            <Th>IFACE</Th><Th>TOTAL RX</Th><Th>TOTAL TX</Th>
          </tr></thead>
          <tbody>
            <tr className="border-t border-border-default">
              <Td><span className="text-green">{network.iface || 'eth0'}</span></Td>
              <Td><span className="text-green">{fmtBytes(network.rxBytes)}</span></Td>
              <Td><span className="text-cyan">{fmtBytes(network.txBytes)}</span></Td>
            </tr>
            {wgPeers.length > 0 && (
              <tr className="border-t border-border-default">
                <Td><span className="text-blue">wg0</span></Td>
                <Td muted>— (WireGuard)</Td><Td muted>—</Td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Ports — clickable */}
      <Card title="ОТКРЫТЫЕ ПОРТЫ / СОКЕТЫ (нажми для деталей)">
        <table className="w-full text-xs font-mono">
          <thead><tr className="text-muted tracking-wider bg-bg-tertiary">
            <Th>PROTO</Th><Th>АДРЕС</Th><Th>ПРОЦЕСС</Th>
          </tr></thead>
          <tbody>
            {(ports || []).map((p, i) => (
              <tr key={i}
                onClick={() => { setSelectedPort(p); setLog('') }}
                className="border-t border-border-default hover:bg-bg-tertiary cursor-pointer transition-colors">
                <Td>
                  <span className={`px-1.5 py-0.5 rounded border text-xs
                    ${p.proto?.includes('tcp') ? 'text-blue border-blue/30 bg-blue/10' : 'text-amber border-amber/30 bg-amber/10'}`}>
                    {p.proto?.toUpperCase()}
                  </span>
                </Td>
                <Td>{p.addr}</Td>
                <Td muted>{p.process}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* WG Peers */}
      {wgPeers.length > 0 && (
        <Card title="WIREGUARD PEERS">
          <table className="w-full text-xs font-mono">
            <thead><tr className="text-muted tracking-wider bg-bg-tertiary">
              <Th>ALLOWED IPS</Th><Th>HANDSHAKE</Th><Th>↓ RX</Th><Th>↑ TX</Th><Th>PUBKEY</Th>
            </tr></thead>
            <tbody>
              {wgPeers.map((p, i) => (
                <tr key={i} className="border-t border-border-default hover:bg-bg-tertiary">
                  <Td>{p.allowedIps}</Td>
                  <Td muted>{p.lastHandshake}</Td>
                  <Td><span className="text-green">{p.rxBytes}</span></Td>
                  <Td><span className="text-cyan">{p.txBytes}</span></Td>
                  <Td muted>{p.pubkey?.slice(0, 14)}...</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Port detail modal */}
      {selectedPort && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
              <div>
                <div className="text-sm font-mono">ПОРТ: {selectedPort.addr}</div>
                <div className="text-xs text-muted mt-0.5">{selectedPort.proto?.toUpperCase()} · {selectedPort.process}</div>
              </div>
              <button onClick={() => { setSelectedPort(null); setLog('') }} className="text-muted hover:text-white"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <InfoRow label="Адрес" value={selectedPort.addr} />
                <InfoRow label="Протокол" value={selectedPort.proto?.toUpperCase()} />
                <InfoRow label="Порт" value={parsePort(selectedPort.addr)} />
                <InfoRow label="Процесс" value={selectedPort.process || '—'} />
              </div>

              {/* Actions */}
              <div className="text-xs text-muted tracking-widest">ДЕЙСТВИЯ</div>
              <div className="grid grid-cols-2 gap-2">
                <ActionBtn
                  icon={<Shield size={12} />}
                  label="UFW Allow"
                  color="green"
                  loading={loading === 'ufw_allow'}
                  onClick={() => runPortAction('ufw_allow', selectedPort)} />
                <ActionBtn
                  icon={<ShieldOff size={12} />}
                  label="UFW Deny"
                  color="red"
                  loading={loading === 'ufw_deny'}
                  onClick={() => runPortAction('ufw_deny', selectedPort)} />
                <ActionBtn
                  icon={<Loader size={12} />}
                  label="Инфо о процессе"
                  color="blue"
                  loading={loading === 'info'}
                  onClick={() => runPortAction('info', selectedPort)} />
                <ActionBtn
                  icon={<X size={12} />}
                  label="Убить процесс (fuser)"
                  color="amber"
                  loading={loading === 'kill'}
                  onClick={() => { if (confirm('Убить процесс на этом порту?')) runPortAction('kill', selectedPort) }} />
              </div>

              {/* Custom command */}
              <CustomCmd serverId={serverId} port={parsePort(selectedPort.addr)}
                onResult={r => setLog(r)} />

              {log && (
                <div>
                  <div className="text-xs text-muted tracking-widest mb-2">ВЫВОД</div>
                  <pre className="bg-bg-primary border border-border-default rounded p-3 text-xs font-mono text-green overflow-auto max-h-40 whitespace-pre-wrap">{log}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomCmd({ serverId, port, onResult }) {
  const [cmd, setCmd] = useState(`ss -tlunp | grep :${port}`)
  const { execCommand } = useSocket()
  const [loading, setLoading] = useState(false)
  async function run(e) {
    e.preventDefault()
    setLoading(true)
    const r = await execCommand(serverId, cmd)
    onResult((r.stdout || '') + (r.stderr || '') + (r.error || ''))
    setLoading(false)
  }
  return (
    <form onSubmit={run} className="flex gap-2">
      <input className="flex-1 bg-bg-primary border border-border-default rounded px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-blue"
        value={cmd} onChange={e => setCmd(e.target.value)} />
      <button type="submit" disabled={loading}
        className="px-3 py-1.5 bg-bg-primary border border-border-default rounded text-xs font-mono text-muted hover:text-white disabled:opacity-50">
        {loading ? <Loader size={11} className="animate-spin" /> : 'Run'}
      </button>
    </form>
  )
}

function ActionBtn({ icon, label, color, loading, onClick }) {
  const colors = {
    green: 'border-green/30 bg-green/10 text-green hover:bg-green/20',
    red:   'border-red/30 bg-red/10 text-red hover:bg-red/20',
    blue:  'border-blue/30 bg-blue/10 text-blue hover:bg-blue/20',
    amber: 'border-amber/30 bg-amber/10 text-amber hover:bg-amber/20',
  }
  return (
    <button onClick={onClick} disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 rounded border text-xs font-mono transition-colors disabled:opacity-50 ${colors[color]}`}>
      {loading ? <Loader size={12} className="animate-spin" /> : icon}
      {label}
    </button>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="bg-bg-primary border border-border-default rounded px-3 py-2">
      <div className="text-muted text-xs mb-0.5">{label}</div>
      <div className="text-white">{value}</div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 text-xs text-muted tracking-widest border-b border-border-default">{title}</div>
      {children}
    </div>
  )
}
const Th = ({ children }) => <th className="text-left px-4 py-2">{children}</th>
const Td = ({ children, muted }) => <td className={`px-4 py-2.5 ${muted ? 'text-muted' : ''}`}>{children}</td>
