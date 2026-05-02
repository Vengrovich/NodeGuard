const jwt = require('jsonwebtoken');
const { Client } = require('ssh2');
const db = require('./db');
const { JWT_SECRET } = require('./middleware');
const { METRICS_CMD, parseMetrics, execCommand, buildConnectConfig } = require('./ssh');

const activePollers = new Map();
const activeTerminals = new Map();

function getServer(serverId, userId) {
  return db.prepare('SELECT * FROM servers WHERE id = ? AND user_id = ?').get(serverId, userId);
}

function setupSocketHandlers(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
      socket.user = jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.user.username}`);

    // ── Metrics polling ──────────────────────────────────────────
    socket.on('subscribe_metrics', ({ serverId }) => {
      const server = getServer(serverId, socket.user.id);
      if (!server) return socket.emit('error', { message: 'Server not found' });

      const key = `${socket.id}:${serverId}`;

      async function fetchMetrics() {
        try {
          const { stdout } = await execCommand(server, METRICS_CMD);
          socket.emit('metrics', { serverId, data: parseMetrics(stdout), ts: Date.now() });
        } catch (err) {
          socket.emit('metrics_error', { serverId, message: err.message });
        }
      }

      fetchMetrics();
      const interval = setInterval(fetchMetrics, 5000);
      activePollers.set(key, interval);
    });

    socket.on('unsubscribe_metrics', ({ serverId }) => {
      const key = `${socket.id}:${serverId}`;
      clearInterval(activePollers.get(key));
      activePollers.delete(key);
    });

    // ── One-off exec ──────────────────────────────────────────────
    socket.on('exec', async ({ serverId, command }) => {
      const server = getServer(serverId, socket.user.id);
      if (!server) return socket.emit('exec_result', { error: 'Server not found' });
      try {
        const result = await execCommand(server, command);
        socket.emit('exec_result', { serverId, command, ...result });
      } catch (err) {
        socket.emit('exec_result', { serverId, command, error: err.message });
      }
    });

    // ── Interactive terminal ──────────────────────────────────────
    socket.on('terminal_start', ({ serverId }) => {
      const server = getServer(serverId, socket.user.id);
      if (!server) return socket.emit('terminal_data', { error: 'Server not found' });

      const termKey = `${socket.id}:term:${serverId}`;
      const conn = new Client();

      conn.on('ready', () => {
        conn.shell({ term: 'xterm-256color', cols: 220, rows: 50 }, (err, stream) => {
          if (err) return socket.emit('terminal_data', { error: err.message });
          activeTerminals.set(termKey, { conn, stream });
          stream.on('data', d => socket.emit('terminal_data', { data: d.toString('utf8') }));
          stream.stderr.on('data', d => socket.emit('terminal_data', { data: d.toString('utf8') }));
          stream.on('close', () => {
            socket.emit('terminal_closed', {});
            activeTerminals.delete(termKey);
          });
        });
      }).on('error', err => socket.emit('terminal_data', { error: err.message }))
        .connect(buildConnectConfig(server));
    });

    socket.on('terminal_input', ({ serverId, data }) => {
      activeTerminals.get(`${socket.id}:term:${serverId}`)?.stream?.write(data);
    });

    socket.on('terminal_resize', ({ serverId, cols, rows }) => {
      activeTerminals.get(`${socket.id}:term:${serverId}`)?.stream?.setWindow(rows, cols);
    });

    socket.on('terminal_stop', ({ serverId }) => {
      const term = activeTerminals.get(`${socket.id}:term:${serverId}`);
      if (term) { term.conn.end(); activeTerminals.delete(`${socket.id}:term:${serverId}`); }
    });

    // ── Docker actions ────────────────────────────────────────────
    socket.on('docker_action', async ({ serverId, action, container }) => {
      const server = getServer(serverId, socket.user.id);
      if (!server) return;
      if (!['start', 'stop', 'restart', 'logs'].includes(action)) return;
      const cmd = action === 'logs'
        ? `docker logs --tail 100 ${container}`
        : `docker ${action} ${container}`;
      try {
        const result = await execCommand(server, cmd);
        socket.emit('docker_result', { action, container, ...result });
      } catch (err) {
        socket.emit('docker_result', { action, container, error: err.message });
      }
    });

    // ── UFW actions ───────────────────────────────────────────────
    socket.on('ufw_action', async ({ serverId, action, rule }) => {
      const server = getServer(serverId, socket.user.id);
      if (!server) return;
      const cmds = { delete: `echo y | ufw delete ${rule}`, allow: `ufw allow ${rule}`, deny: `ufw deny ${rule}` };
      if (!cmds[action]) return;
      try {
        const result = await execCommand(server, cmds[action]);
        socket.emit('ufw_result', { action, rule, ...result });
      } catch (err) {
        socket.emit('ufw_result', { action, rule, error: err.message });
      }
    });

    // ── Cleanup on disconnect ─────────────────────────────────────
    socket.on('disconnect', () => {
      for (const [key, interval] of activePollers)
        if (key.startsWith(socket.id)) { clearInterval(interval); activePollers.delete(key); }
      for (const [key, term] of activeTerminals)
        if (key.startsWith(socket.id)) { term.conn.end(); activeTerminals.delete(key); }
      console.log(`[WS] Disconnected: ${socket.user.username}`);
    });
  });
}

module.exports = { setupSocketHandlers };
