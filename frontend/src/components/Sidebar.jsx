import React, { useState } from 'react'
import { useStore } from '../store'
import ServerModal from './ServerModal'
import ProfileModal from './ProfileModal'
import { Server, Plus, Pencil, UserCog } from 'lucide-react'

export default function Sidebar({ onAddServer }) {
  const { servers, activeServerId, setActiveServer, username } = useStore()
  const metrics = useStore(s => s.metrics)
  const [editServer, setEditServer] = useState(null)
  const [showProfile, setShowProfile] = useState(false)

  return (
    <div className="w-52 flex flex-col bg-bg-secondary border-r border-border-default shrink-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-default">
        <Server size={14} className="text-green" />
        <span className="text-green text-xs font-mono font-medium tracking-widest">VPS PANEL</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-1 text-xs text-muted tracking-widest mb-1">СЕРВЕРЫ</div>
        {servers.map(server => {
          const isActive = server.id === activeServerId
          const hasMetrics = !!metrics[server.id]
          return (
            <div key={server.id} onClick={() => setActiveServer(server.id)}
              className={`group flex items-center gap-2 px-3 py-2 cursor-pointer rounded mx-1 mb-0.5 transition-colors
                ${isActive ? 'bg-bg-tertiary border border-border-hover' : 'hover:bg-bg-tertiary border border-transparent'}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${hasMetrics ? 'bg-green' : 'bg-border-hover'}`}
                style={hasMetrics ? { boxShadow: '0 0 4px #39d353' } : {}} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-white truncate">{server.name}</div>
                <div className="text-xs text-muted truncate">{server.host}</div>
              </div>
              <button onClick={e => { e.stopPropagation(); setEditServer(server) }}
                className="opacity-0 group-hover:opacity-100 text-muted hover:text-white transition-all">
                <Pencil size={11} />
              </button>
            </div>
          )
        })}
        <button onClick={onAddServer}
          className="flex items-center gap-2 px-3 py-2 mx-1 mt-1 text-muted hover:text-green transition-colors rounded hover:bg-bg-tertiary w-[calc(100%-8px)] text-xs font-mono">
          <Plus size={12} /> добавить сервер
        </button>
      </div>

      {/* Footer: username + profile button */}
      <div className="border-t border-border-default px-3 py-2 flex items-center justify-between">
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-2 text-muted hover:text-white transition-colors group flex-1 min-w-0"
          title="Настройки профиля"
        >
          <div className="w-5 h-5 rounded-full bg-green/10 border border-green/30 flex items-center justify-center shrink-0">
            <span className="text-green text-xs font-mono">{username?.[0]?.toUpperCase()}</span>
          </div>
          <span className="text-xs font-mono truncate group-hover:text-white">{username}</span>
        </button>
        <button
          onClick={() => setShowProfile(true)}
          className="text-muted hover:text-blue transition-colors ml-2 shrink-0"
          title="Редактировать профиль"
        >
          <UserCog size={13} />
        </button>
      </div>

      {editServer && <ServerModal server={editServer} onClose={() => setEditServer(null)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  )
}
