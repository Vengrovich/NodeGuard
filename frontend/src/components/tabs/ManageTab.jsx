import React, { useState, useEffect } from 'react'
import { useStore } from '../../store'
import { useSocket } from '../../hooks/useSocket'
import { Loader, Plus, Pencil, Trash2, X, Check } from 'lucide-react'

const DEFAULT_ACTIONS = [
  { id: 'df',       label: 'Диск (df -h)',           cmd: 'df -h',                                              danger: false },
  { id: 'ps',       label: 'Топ процессов',           cmd: 'ps aux --sort=-%cpu | head -20',                    danger: false },
  { id: 'ss',       label: 'Соединения (ss)',         cmd: 'ss -tunp',                                          danger: false },
  { id: 'who',      label: 'Кто подключён',           cmd: 'who && last -n 10',                                 danger: false },
  { id: 'mem',      label: 'Память детально',         cmd: 'free -h && cat /proc/meminfo | head -20',           danger: false },
  { id: 'cpu',      label: 'CPU инфо',                cmd: 'lscpu | head -30',                                  danger: false },
  { id: 'net',      label: 'Сетевые интерфейсы',     cmd: 'ip addr && ip route',                               danger: false },
  { id: 'dns',      label: 'DNS настройки',           cmd: 'cat /etc/resolv.conf && resolvectl status 2>/dev/null | head -20', danger: false },
  { id: 'hosts',    label: '/etc/hosts',              cmd: 'cat /etc/hosts',                                    danger: false },
  { id: 'cron',     label: 'Crontab',                 cmd: 'crontab -l 2>/dev/null || echo "empty"; ls /etc/cron.d/', danger: false },
  { id: 'upd',      label: 'Список обновлений',       cmd: 'apt list --upgradable 2>/dev/null',                 danger: false },
  { id: 'upgrade',  label: 'Обновить систему',        cmd: 'apt-get update -q && apt-get upgrade -y 2>&1 | tail -30', danger: false },
  { id: 'autoremove', label: 'apt autoremove',        cmd: 'apt-get autoremove -y 2>&1',                        danger: false },
  { id: 'dps',      label: 'Docker ps -a',            cmd: 'docker ps -a --format "table {{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}"', danger: false },
  { id: 'dimages',  label: 'Docker images',           cmd: 'docker images',                                     danger: false },
  { id: 'dstats',   label: 'Docker stats (once)',     cmd: 'docker stats --no-stream',                          danger: false },
  { id: 'dpull',    label: 'Docker pull all',         cmd: "docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | xargs -I{} docker pull {}", danger: false },
  { id: 'dprune',   label: 'Docker system prune',     cmd: 'docker system prune -f 2>&1',                      danger: false },
  { id: 'journal',  label: 'Системный лог (50)',      cmd: 'journalctl -n 50 --no-pager',                      danger: false },
  { id: 'journal_err', label: 'Только ошибки',       cmd: 'journalctl -p err -n 30 --no-pager',               danger: false },
  { id: 'ufw',      label: 'UFW статус',              cmd: 'ufw status verbose',                                danger: false },
  { id: 'fail2ban', label: 'Fail2ban статус',         cmd: 'fail2ban-client status 2>/dev/null || echo "not installed"', danger: false },
  { id: 'ssh_cfg',  label: 'SSH конфиг',              cmd: 'cat /etc/ssh/sshd_config | grep -v "^#" | grep -v "^$"', danger: false },
  { id: 'reboot',   label: '⟳ Reboot',               cmd: 'reboot',                                           danger: true  },
  { id: 'shutdown', label: '⏻ Shutdown',             cmd: 'shutdown -h now',                                  danger: true  },
  { id: 'shutdown5', label: '⏻ Shutdown через 5 мин', cmd: 'shutdown -h +5',                                  danger: true  },
]

const LS_KEY = 'vps-manage-actions'

function loadActions() {
  try {
    const saved = localStorage.getItem(LS_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_ACTIONS
  } catch { return DEFAULT_ACTIONS }
}
function saveActions(actions) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(actions)) } catch {}
}

export default function ManageTab({ serverId }) {
  const metrics = useStore(s => s.metrics[serverId])
  const server = useStore(s => s.getActiveServer())
  const { execCommand } = useSocket()
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(null)
  const [actions, setActions] = useState(loadActions)
  const [editModal, setEditModal] = useState(null) // null | 'new' | action object
  const [editForm, setEditForm] = useState({ label: '', cmd: '', danger: false })

  useEffect(() => { saveActions(actions) }, [actions])

  async function run(action) {
    if (action.danger && !confirm(`Выполнить: "${action.label}"?`)) return
    setLoading(action.id)
    const result = await execCommand(serverId, action.cmd)
    setResults(r => ({ ...r, [action.id]: { label: action.label, output: result.stdout || result.stderr || result.error } }))
    setLoading(null)
  }

  function openEdit(action) {
    setEditForm({ label: action.label, cmd: action.cmd, danger: action.danger })
    setEditModal(action)
  }

  function openNew() {
    setEditForm({ label: '', cmd: '', danger: false })
    setEditModal('new')
  }

  function saveEdit() {
    if (!editForm.label || !editForm.cmd) return
    if (editModal === 'new') {
      setActions(a => [...a, { id: `custom_${Date.now()}`, ...editForm }])
    } else {
      setActions(a => a.map(x => x.id === editModal.id ? { ...x, ...editForm } : x))
    }
    setEditModal(null)
  }

  function deleteAction(id) {
    if (!confirm('Удалить действие?')) return
    setActions(a => a.filter(x => x.id !== id))
  }

  const info = metrics ? [
    ['Hostname', metrics.hostname],
    ['OS', metrics.os],
    ['Kernel', metrics.kernel],
    ['Uptime', metrics.uptime],
    ['CPU Usage', `${metrics.cpu?.usage?.toFixed(1)}%`],
    ['Load avg', `${metrics.cpu?.load1} / ${metrics.cpu?.load5} / ${metrics.cpu?.load15}`],
    ['RAM', `${metrics.memory?.used} / ${metrics.memory?.total} MB`],
    ['Disk /', `${metrics.disk?.used} / ${metrics.disk?.total} (${metrics.disk?.usedPercent}%)`],
  ] : []

  return (
    <div className="space-y-4">
      {/* Server info */}
      <div className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 text-xs text-muted tracking-widest border-b border-border-default">ИНФОРМАЦИЯ О СЕРВЕРЕ</div>
        <div className="grid grid-cols-2 divide-x divide-border-default">
          {info.map(([k, v]) => (
            <div key={k} className="px-4 py-2.5 border-b border-border-default flex justify-between gap-2">
              <span className="text-xs text-muted">{k}</span>
              <span className="text-xs font-mono text-white text-right">{v || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SSH string */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <div className="text-xs text-muted tracking-widest mb-2">SSH ПОДКЛЮЧЕНИЕ</div>
        <div className="bg-bg-primary border border-border-default rounded px-3 py-2 font-mono text-xs text-green select-all">
          ssh {server?.username}@{server?.host} -p {server?.port}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs text-muted tracking-widest">БЫСТРЫЕ ДЕЙСТВИЯ</div>
          <button onClick={openNew}
            className="flex items-center gap-1 text-xs text-blue border border-blue/30 bg-blue/10 hover:bg-blue/20 rounded px-2 py-1 font-mono transition-colors">
            <Plus size={11} /> Добавить
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map(action => (
            <div key={action.id} className="group relative flex items-center gap-0">
              <button
                onClick={() => run(action)}
                disabled={loading === action.id}
                className={`flex items-center gap-1.5 pl-3 pr-1 py-1.5 text-xs font-mono rounded-l border transition-colors disabled:opacity-50
                  ${action.danger
                    ? 'border-red/30 bg-red/10 text-red hover:bg-red/20'
                    : 'border-border-default bg-bg-primary text-muted hover:text-white hover:border-border-hover'}`}>
                {loading === action.id && <Loader size={11} className="animate-spin" />}
                {action.label}
              </button>
              {/* Edit/Delete controls */}
              <div className="flex border-t border-b border-r border-border-default rounded-r overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(action)}
                  className="px-1.5 py-1.5 bg-bg-primary text-muted hover:text-blue hover:bg-bg-tertiary transition-colors border-r border-border-default">
                  <Pencil size={10} />
                </button>
                <button onClick={() => deleteAction(action.id)}
                  className="px-1.5 py-1.5 bg-bg-primary text-muted hover:text-red hover:bg-bg-tertiary transition-colors">
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted">Наведи на кнопку чтобы редактировать или удалить</div>
      </div>

      {/* Results */}
      {Object.entries(results).map(([key, { label, output }]) => output && (
        <div key={key} className="bg-bg-secondary border border-border-default rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border-default">
            <span className="text-xs text-muted tracking-widest">{label}</span>
            <button onClick={() => setResults(r => { const n = { ...r }; delete n[key]; return n })}
              className="text-muted hover:text-white text-xs">✕</button>
          </div>
          <pre className="p-4 text-xs font-mono text-green overflow-x-auto whitespace-pre-wrap max-h-80">{output}</pre>
        </div>
      ))}

      {/* Edit/New modal */}
      {editModal !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
              <span className="text-sm font-mono">{editModal === 'new' ? 'НОВОЕ ДЕЙСТВИЕ' : 'РЕДАКТИРОВАТЬ'}</span>
              <button onClick={() => setEditModal(null)} className="text-muted hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-muted text-xs tracking-widest mb-1.5">НАЗВАНИЕ КНОПКИ</label>
                <input className={inp} value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} placeholder="Моя команда" />
              </div>
              <div>
                <label className="block text-muted text-xs tracking-widest mb-1.5">КОМАНДА</label>
                <textarea className={`${inp} h-24 resize-none`} value={editForm.cmd}
                  onChange={e => setEditForm(f => ({ ...f, cmd: e.target.value }))}
                  placeholder="df -h && free -h" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.danger}
                  onChange={e => setEditForm(f => ({ ...f, danger: e.target.checked }))}
                  className="accent-red w-3.5 h-3.5" />
                <span className="text-xs text-muted">Опасная команда (показывать красной + требовать подтверждение)</span>
              </label>
              <div className="flex gap-2 pt-1">
                <button onClick={saveEdit}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green/10 hover:bg-green/20 border border-green/40 text-green rounded text-xs font-mono transition-colors">
                  <Check size={12} /> Сохранить
                </button>
                <button onClick={() => setEditModal(null)}
                  className="px-4 py-2 border border-border-default text-muted hover:text-white rounded text-xs font-mono transition-colors">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inp = 'w-full bg-bg-primary border border-border-default rounded px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-blue'
