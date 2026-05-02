import React, { useEffect, useRef, useState } from 'react'
import { getSocket } from '../../hooks/useSocket'

export default function TerminalTab({ serverId }) {
  const termRef = useRef(null)
  const xtermRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let term

    async function init() {
      const { Terminal } = await import('xterm')
      const { FitAddon } = await import('xterm-addon-fit')

      term = new Terminal({
        theme: {
          background: '#0d1117', foreground: '#c9d1d9', cursor: '#39d353',
          selection: '#39d35344', green: '#39d353', brightGreen: '#56d364',
        },
        fontFamily: 'JetBrains Mono, Fira Code, monospace',
        fontSize: 13, lineHeight: 1.4, cursorBlink: true,
      })

      const fitAddon = new FitAddon()
      term.loadAddon(fitAddon)
      term.open(termRef.current)
      fitAddon.fit()
      xtermRef.current = term

      const socket = getSocket()
      if (!socket) { setError('WebSocket не подключён'); return }

      socket.emit('terminal_start', { serverId })
      setConnected(true)

      socket.on('terminal_data', ({ data, error: err }) => {
        if (err) { term.write(`\r\n\x1b[31m${err}\x1b[0m\r\n`); setError(err); return }
        term.write(data)
      })
      socket.on('terminal_closed', () => {
        term.write('\r\n\x1b[33m[сессия завершена]\x1b[0m\r\n')
        setConnected(false)
      })

      term.onData(data => socket.emit('terminal_input', { serverId, data }))

      const obs = new ResizeObserver(() => {
        fitAddon.fit()
        socket.emit('terminal_resize', { serverId, cols: term.cols, rows: term.rows })
      })
      if (termRef.current) obs.observe(termRef.current)
      return () => obs.disconnect()
    }

    init()

    return () => {
      const socket = getSocket()
      if (socket) {
        socket.emit('terminal_stop', { serverId })
        socket.off('terminal_data')
        socket.off('terminal_closed')
      }
      xtermRef.current?.dispose()
    }
  }, [serverId])

  function handleReconnect() {
    setError(null)
    const socket = getSocket()
    if (!socket) return
    socket.emit('terminal_start', { serverId })
    setConnected(true)
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      <div className="flex items-center gap-3 mb-2">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green' : 'bg-muted'}`}
          style={connected ? { boxShadow: '0 0 4px #39d353' } : {}} />
        <span className="text-xs text-muted font-mono">{connected ? 'SSH СЕССИЯ АКТИВНА' : 'НЕ ПОДКЛЮЧЕНО'}</span>
        {!connected && (
          <button onClick={handleReconnect}
            className="ml-2 text-xs px-2 py-0.5 border border-green/40 text-green rounded hover:bg-green/10 transition-colors">
            Переподключиться
          </button>
        )}
      </div>
      {error && <div className="mb-2 text-xs text-red border border-red/30 bg-red/10 rounded px-3 py-2">{error}</div>}
      <div ref={termRef} className="flex-1 rounded-lg border border-border-default overflow-hidden"
        style={{ background: '#0d1117' }} />
    </div>
  )
}
