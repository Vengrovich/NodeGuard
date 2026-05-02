import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

axios.interceptors.request.use(cfg => {
  const token = useStore.getState().token
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

export const useStore = create(
  persist(
    (set, get) => ({
      token: null,
      username: null,
      servers: [],
      activeServerId: null,
      metrics: {},
      metricsHistory: {},

      login: async (username, password) => {
        const { data } = await axios.post('/api/auth/login', { username, password })
        set({ token: data.token, username: data.username })
        return data
      },

      logout: () => set({ token: null, username: null, servers: [], activeServerId: null, metrics: {} }),

      changePassword: async (oldPassword, newPassword) => {
        await axios.post('/api/auth/change-password', { oldPassword, newPassword })
      },

      changeUsername: async (newUsername, password) => {
        const { data } = await axios.post('/api/auth/change-username', { newUsername, password })
        set({ token: data.token, username: data.username })
        return data
      },

      fetchServers: async () => {
        const { data } = await axios.get('/api/servers')
        set({ servers: data })
        return data
      },

      addServer: async (payload) => {
        const { data } = await axios.post('/api/servers', payload)
        set(s => ({ servers: [...s.servers, data] }))
        return data
      },

      updateServer: async (id, payload) => {
        await axios.put(`/api/servers/${id}`, payload)
        set(s => ({ servers: s.servers.map(sv => sv.id === id ? { ...sv, ...payload } : sv) }))
      },

      deleteServer: async (id) => {
        await axios.delete(`/api/servers/${id}`)
        set(s => ({
          servers: s.servers.filter(sv => sv.id !== id),
          activeServerId: s.activeServerId === id ? null : s.activeServerId
        }))
      },

      setActiveServer: (id) => set({ activeServerId: id }),

      updateMetrics: (serverId, data) => {
        set(s => {
          const MAX = 60
          const prev = s.metricsHistory[serverId] || { cpu: [], mem: [], rx: [], tx: [] }
          return {
            metrics: { ...s.metrics, [serverId]: data },
            metricsHistory: {
              ...s.metricsHistory,
              [serverId]: {
                cpu: [...prev.cpu, data.cpu.usage].slice(-MAX),
                mem: [...prev.mem, data.memory.used].slice(-MAX),
                rx:  [...prev.rx,  data.network.rxBytes].slice(-MAX),
                tx:  [...prev.tx,  data.network.txBytes].slice(-MAX),
              }
            }
          }
        })
      },

      getActiveServer: () => {
        const { servers, activeServerId } = get()
        return servers.find(s => s.id === activeServerId) || null
      }
    }),
    {
      name: 'vps-dashboard',
      partialize: s => ({ token: s.token, username: s.username, activeServerId: s.activeServerId })
    }
  )
)
