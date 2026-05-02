import React, { useState, useRef, useCallback } from 'react'
import { useStore } from '../../store'
import { MetricCard } from '../MetricCard'
import { useSocket } from '../../hooks/useSocket'
import { X, Loader, GripVertical } from 'lucide-react'

function fmtBytes(b) {
  if (b > 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB'
  if (b > 1e3) return (b / 1e3).toFixed(1) + ' KB'
  return b + ' B'
}

const DEFAULT_ORDER = ['cpu', 'memory', 'disk', 'rx', 'tx', 'wg']
const LS_ORDER_KEY = 'vps-overview-order'

function loadOrder() {
  try { const s = localStorage.getItem(LS_ORDER_KEY); return s ? JSON.parse(s) : DEFAULT_ORDER } catch { return DEFAULT_ORDER }
}

export default function OverviewTab({ serverId }) {
  const metrics = useStore(s => s.metrics[serverId])
  const history = useStore(s => s.metricsHistory[serverId])
  const { dockerAction } = useSocket()
  const [dockerModal, setDockerModal] = useState(null)
  const [dockerLog, setDockerLog] = useState('')
  const [dockerLoading, setDockerLoading] = useState(null)

  const [cardOrder, setCardOrder] = useState(loadOrder)
  const dragIdx = useRef(null)
  const dragOverIdx = useRef(null)

  function onDragStart(i) { dragIdx.current = i }
  function onDragOver(e, i) { e.preventDefault(); dragOverIdx.current = i }
  function onDrop() {
    const from = dragIdx.current
    const to = dragOverIdx.current
    if (from === null || to === null || from === to) return
    const next = [...cardOrder]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setCardOrder(next)
    try { localStorage.setItem(LS_ORDER_KEY, JSON.stringify(next)) } catch {}
    dragIdx.current = null; dragOverIdx.current = null
  }

  if (!metrics) return (
    <div className="grid grid-cols-3 gap-3">
      {Array(6).fill(0).map((_, i) => (
        <div key={i} className="bg-bg-secondary border border-border-default rounded-lg p-4 h-32 animate-pulse" />
      ))}
    </div>
  )

  const { cpu, memory, disk, network, docker, wgPeers } = metrics

  const CARDS = {
    cpu: <MetricCard label="CPU" value={`${cpu.usage.toFixed(1)}%`}
      sub={`load: ${cpu.load1} / ${cpu.load5} / ${cpu.load15}`}
      percent={cpu.usage} color="#39d353" sparkData={history?.cpu} />,
    memory: <MetricCard label="MEMORY" value={`${memory.used} MB`}
      sub={`${memory.used} / ${memory.total} MB`}
      percent={(memory.used / memory.total) * 100} color="#bc8cff" sparkData={history?.mem} />,
    disk: <MetricCard label="DISK /" value={`${disk.usedPercent}%`}
      sub={`${disk.used} / ${disk.total}`} percent={disk.usedPercent}
      color={disk.usedPercent > 80 ? '#f85149' : '#e3b341'} />,
    rx: <MetricCard label="NET ↓ RX" value={fmtBytes(network.rxBytes)} color="#56d364" sparkData={history?.rx} />,
    tx: <MetricCard label="NET ↑ TX" value={fmtBytes(network.txBytes)} color="#56d364" sparkData={history?.tx} />,
    wg: (
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <div className="text-xs text-muted tracking-widest mb-1.5">WG CLIENTS</div>
        <div className="text-2xl font-mono font-medium text-green mb-1">{wgPeers.length}</div>
        <div className="text-xs text-muted mb-3">active peers</div>
        {wgPeers.map((p, i) => (
          <div key={i} className="flex justify-between text-xs text-muted mb-1">
            <span className="text-white">{p.allowedIps}</span>
            <span>{p.lastHandshake?.includes('second') ? <span className="text-green">●</span> : '○'} {p.lastHandshake}</span>
          </div>
        ))}
      </div>
    ),
  }

  async function handleDockerAction(action, container) {
    if (action === 'logs') {
      setDockerLoading('logs')
      const result = await dockerAction(serverId, 'logs', container.name)
      setDockerLog(result.stdout || result.stderr || result.error || '')
      setDockerLoading(null)
    } else {
      setDockerLoading(action + container.name)
      await dockerAction(serverId, action, container.name)
      setDockerLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Draggable metric cards */}
      <div className="text-xs text-muted mb-1 flex items-center gap-2">
        <GripVertical size={12} /> Перетащи карточки чтобы изменить порядок
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cardOrder.map((key, i) => (
          <div key={key}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={onDrop}
            className="cursor-grab active:cursor-grabbing"
            style={{ userSelect: 'none' }}>
            {CARDS[key]}
          </div>
        ))}
      </div>

      {/* Docker containers */}
      {docker.length > 0 && (
        <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 text-xs text-muted tracking-widest border-b border-border-default">DOCKER CONTAINERS</div>
          <table className="w-full text-xs font-mono">
            <thead><tr className="text-muted tracking-wider bg-bg-tertiary">
              <Th>NAME</Th><Th>IMAGE</Th><Th>STATUS</Th><Th>ДЕЙСТВИЯ</Th>
            </tr></thead>
            <tbody>
              {docker.map((c, i) => (
                <tr key={i}
                  className="border-t border-border-default hover:bg-bg-tertiary cursor-pointer transition-colors"
                  onClick={() => { setDockerModal(c); setDockerLog('') }}>
                  <Td>
                    <span className="inline-block w-2 h-2 rounded-full bg-green mr-2" style={{ boxShadow: '0 0 4px #39d353' }} />
                    {c.name}
                  </Td>
                  <Td muted>{c.image}</Td>
                  <Td><Badge text={c.status} /></Td>
                  <Td onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1.5">
                      {['restart', 'stop', 'logs'].map(a => (
                        <Btn key={a}
                          loading={dockerLoading === a + c.name || (a === 'logs' && dockerLoading === 'logs')}
                          onClick={() => handleDockerAction(a, c)}>
                          {a}
                        </Btn>
                      ))}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* WG Peers table */}
      {wgPeers.length > 0 && (
        <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 text-xs text-muted tracking-widest border-b border-border-default">AMNEZIAWG PEERS</div>
          <table className="w-full text-xs font-mono">
            <thead><tr className="text-muted tracking-wider bg-bg-tertiary">
              <Th>ALLOWED IPS</Th><Th>LAST HANDSHAKE</Th><Th>↓ RX</Th><Th>↑ TX</Th>
            </tr></thead>
            <tbody>
              {wgPeers.map((p, i) => (
                <tr key={i} className="border-t border-border-default hover:bg-bg-tertiary">
                  <Td>{p.allowedIps}</Td>
                  <Td muted>{p.lastHandshake}</Td>
                  <Td><span className="text-green">{p.rxBytes}</span></Td>
                  <Td><span className="text-cyan">{p.txBytes}</span></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Docker detail modal */}
      {dockerModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green" style={{ boxShadow: '0 0 4px #39d353' }} />
                  <span className="text-sm font-mono">{dockerModal.name}</span>
                </div>
                <div className="text-xs text-muted mt-0.5">{dockerModal.image}</div>
              </div>
              <button onClick={() => { setDockerModal(null); setDockerLog('') }} className="text-muted hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Info */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <InfoRow label="Имя" value={dockerModal.name} />
                <InfoRow label="Статус" value={dockerModal.status} highlight />
                <InfoRow label="Образ" value={dockerModal.image} />
              </div>
              {/* Actions */}
              <div className="text-xs text-muted tracking-widest">УПРАВЛЕНИЕ</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { action: 'restart', label: '↺ Restart', color: 'blue' },
                  { action: 'stop',    label: '■ Stop',    color: 'amber' },
                  { action: 'start',   label: '▶ Start',   color: 'green' },
                  { action: 'logs',    label: '📋 Logs',   color: 'default' },
                ].map(({ action, label, color }) => (
                  <ActionBtn key={action} label={label} color={color}
                    loading={dockerLoading === action + dockerModal.name || (action === 'logs' && dockerLoading === 'logs')}
                    onClick={() => handleDockerAction(action, dockerModal)} />
                ))}
              </div>
              {/* Logs output */}
              {dockerLog && (
                <div>
                  <div className="text-xs text-muted tracking-widest mb-2">ЛОГИ</div>
                  <pre className="bg-bg-primary border border-border-default rounded p-3 text-xs font-mono text-green overflow-auto max-h-64 whitespace-pre-wrap">{dockerLog}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ label, color, loading, onClick }) {
  const colors = {
    green:   'border-green/30 bg-green/10 text-green hover:bg-green/20',
    blue:    'border-blue/30 bg-blue/10 text-blue hover:bg-blue/20',
    amber:   'border-amber/30 bg-amber/10 text-amber hover:bg-amber/20',
    default: 'border-border-default bg-bg-primary text-muted hover:text-white hover:border-border-hover',
  }
  return (
    <button onClick={onClick} disabled={loading}
      className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs font-mono transition-colors disabled:opacity-50 ${colors[color]}`}>
      {loading ? <Loader size={12} className="animate-spin" /> : null}
      {label}
    </button>
  )
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="bg-bg-primary border border-border-default rounded px-3 py-2">
      <div className="text-muted text-xs mb-0.5">{label}</div>
      <div className={highlight ? 'text-green' : 'text-white'}>{value}</div>
    </div>
  )
}

function Badge({ text }) {
  const up = text?.toLowerCase().includes('up')
  return <span className={`text-xs px-2 py-0.5 rounded border ${up ? 'text-green border-green/30 bg-green/10' : 'text-red border-red/30 bg-red/10'}`}>{text}</span>
}
function Btn({ children, onClick, loading }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1 px-2 py-0.5 text-xs border border-border-default rounded text-muted hover:text-white hover:border-border-hover transition-colors disabled:opacity-50">
      {loading ? <Loader size={10} className="animate-spin" /> : null}{children}
    </button>
  )
}
const Th = ({ children }) => <th className="text-left px-4 py-2">{children}</th>
const Td = ({ children, muted }) => <td className={`px-4 py-2.5 ${muted ? 'text-muted' : ''}`}>{children}</td>
