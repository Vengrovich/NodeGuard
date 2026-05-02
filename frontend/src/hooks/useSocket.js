import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useStore } from '../store'

let socketInstance = null
export const getSocket = () => socketInstance

export function useSocket() {
  const token = useStore(s => s.token)
  const updateMetrics = useStore(s => s.updateMetrics)
  const socketRef = useRef(null)

  useEffect(() => {
    if (!token) return
    const socket = io('/', { auth: { token }, transports: ['websocket'] })
    socketInstance = socket
    socketRef.current = socket
    socket.on('metrics', ({ serverId, data }) => updateMetrics(serverId, data))
    socket.on('connect', () => console.log('[WS] connected'))
    socket.on('disconnect', () => console.log('[WS] disconnected'))
    return () => { socket.disconnect(); socketInstance = null }
  }, [token])

  const subscribeMetrics = useCallback((serverId) => {
    socketRef.current?.emit('subscribe_metrics', { serverId })
  }, [])

  const unsubscribeMetrics = useCallback((serverId) => {
    socketRef.current?.emit('unsubscribe_metrics', { serverId })
  }, [])

  const execCommand = useCallback((serverId, command) => new Promise(resolve => {
    const s = socketRef.current
    if (!s) return resolve({ error: 'No connection' })
    const handler = result => { if (result.command === command) { s.off('exec_result', handler); resolve(result) } }
    s.on('exec_result', handler)
    s.emit('exec', { serverId, command })
    setTimeout(() => { s.off('exec_result', handler); resolve({ error: 'Timeout' }) }, 30000)
  }), [])

  const dockerAction = useCallback((serverId, action, container) => new Promise(resolve => {
    const s = socketRef.current
    if (!s) return resolve({ error: 'No connection' })
    const handler = result => {
      if (result.container === container && result.action === action) { s.off('docker_result', handler); resolve(result) }
    }
    s.on('docker_result', handler)
    s.emit('docker_action', { serverId, action, container })
    setTimeout(() => { s.off('docker_result', handler); resolve({ error: 'Timeout' }) }, 30000)
  }), [])

  const ufwAction = useCallback((serverId, action, rule) => new Promise(resolve => {
    const s = socketRef.current
    if (!s) return resolve({ error: 'No connection' })
    const handler = result => { s.off('ufw_result', handler); resolve(result) }
    s.on('ufw_result', handler)
    s.emit('ufw_action', { serverId, action, rule })
    setTimeout(() => { s.off('ufw_result', handler); resolve({ error: 'Timeout' }) }, 15000)
  }), [])

  return { socket: socketRef.current, subscribeMetrics, unsubscribeMetrics, execCommand, dockerAction, ufwAction }
}
