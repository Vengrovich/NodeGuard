import React, { useEffect, useState } from 'react'
import { useStore } from '../store'
import { useSocket } from '../hooks/useSocket'
import Sidebar from '../components/Sidebar'
import OverviewTab from '../components/tabs/OverviewTab'
import ProtocolsTab from '../components/tabs/ProtocolsTab'
import NetworkTab from '../components/tabs/NetworkTab'
import FirewallTab from '../components/tabs/FirewallTab'
import TerminalTab from '../components/tabs/TerminalTab'
import ManageTab from '../components/tabs/ManageTab'
import ServerModal from '../components/ServerModal'
import { Activity, GitBranch, Wifi, Shield, SquareTerminal, Settings, Plus } from 'lucide-react'

const TABS = [
  { id: 'overview',  label: 'ОБЗОР',      Icon: Activity },
  { id: 'protocols', label: 'ПРОТОКОЛЫ',  Icon: GitBranch },
  { id: 'network',   label: 'СЕТЬ',       Icon: Wifi },
  { id: 'firewall',  label: 'ФАЙРВОЛ',    Icon: Shield },
  { id: 'terminal',  label: 'ТЕРМИНАЛ',   Icon: SquareTerminal },
  { id: 'manage',    label: 'УПРАВЛЕНИЕ', Icon: Settings },
]

export default function DashboardPage() {
  const { fetchServers, servers, activeServerId, setActiveServer } = useStore()
  const { subscribeMetrics, unsubscribeMetrics } = useSocket()
  const [tab, setTab] = useState('overview')
  const [showAddServer, setShowAddServer] = useState(false)
  const metrics = useStore(s => s.metrics[activeServerId])
  const server = useStore(s => s.getActiveServer())

  useEffect(() => {
    fetchServers().then(list => {
      if (list.length > 0 && !activeServerId) setActiveServer(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (!activeServerId) return
    subscribeMetrics(activeServerId)
    return () => unsubscribeMetrics(activeServerId)
  }, [activeServerId])

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar onAddServer={() => setShowAddServer(true)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-bg-secondary border-b border-border-default shrink-0">
          {server ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-green shrink-0" style={{ boxShadow: '0 0 6px #39d353' }} />
              <span className="text-green font-mono font-medium tracking-widest text-sm">{server.name}</span>
              <span className="text-muted text-xs">{server.host}:{server.port}</span>
              <span className="text-border-hover">|</span>
              <span className="text-muted text-xs">{metrics?.uptime || '...'}</span>
            </>
          ) : (
            <span className="text-muted text-sm">Выберите сервер</span>
          )}
          <div className="ml-auto"><Clock /></div>
        </div>

        {/* Tabs */}
        <div className="flex bg-bg-secondary border-b border-border-default shrink-0 overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono tracking-wider whitespace-nowrap border-b-2 transition-colors
                ${tab === id ? 'text-blue border-blue' : 'text-muted border-transparent hover:text-white'}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!server ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <span className="text-muted text-sm">Нет серверов</span>
              <button onClick={() => setShowAddServer(true)}
                className="flex items-center gap-2 bg-green/10 hover:bg-green/20 border border-green/40 text-green rounded px-4 py-2 text-sm font-mono transition-colors">
                <Plus size={14} /> Добавить сервер
              </button>
            </div>
          ) : (
            <>
              {tab === 'overview'  && <OverviewTab serverId={activeServerId} />}
              {tab === 'protocols' && <ProtocolsTab serverId={activeServerId} />}
              {tab === 'network'   && <NetworkTab serverId={activeServerId} />}
              {tab === 'firewall'  && <FirewallTab serverId={activeServerId} />}
              {tab === 'terminal'  && <TerminalTab serverId={activeServerId} />}
              {tab === 'manage'    && <ManageTab serverId={activeServerId} />}
            </>
          )}
        </div>
      </div>

      {showAddServer && <ServerModal onClose={() => setShowAddServer(false)} />}
    </div>
  )
}

function Clock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t) }, [])
  return <span className="text-muted text-xs font-mono">{time.toTimeString().slice(0, 8)}</span>
}
