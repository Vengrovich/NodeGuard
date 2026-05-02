require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const db = require('./db');
const authRoutes = require('./routes/auth');
const serversRoutes = require('./routes/servers');
const { setupSocketHandlers } = require('./socket');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.use('/api/auth', authRoutes);
app.use('/api/servers', serversRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`[VPS Dashboard] Backend on port ${PORT}`));
