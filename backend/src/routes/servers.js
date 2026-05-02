const router = require('express').Router();
const { authMiddleware } = require('../middleware');
const db = require('../db');
const { testConnection } = require('../ssh');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const servers = db.prepare(
    'SELECT id, name, host, port, username, auth_type, tags, created_at FROM servers WHERE user_id = ?'
  ).all(req.user.id);
  res.json(servers.map(s => ({ ...s, tags: JSON.parse(s.tags || '[]') })));
});

router.post('/', (req, res) => {
  const { name, host, port = 22, username, auth_type, password, private_key, passphrase, tags = [] } = req.body;
  if (!name || !host || !username || !auth_type)
    return res.status(400).json({ error: 'Missing fields' });
  const result = db.prepare(`
    INSERT INTO servers (user_id, name, host, port, username, auth_type, password, private_key, passphrase, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, name, host, port, username, auth_type,
    password || null, private_key || null, passphrase || null, JSON.stringify(tags));
  res.json({ id: result.lastInsertRowid, name, host, port, username, auth_type, tags });
});

router.put('/:id', (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!server) return res.status(404).json({ error: 'Not found' });
  const { name, host, port, username, auth_type, password, private_key, passphrase, tags } = req.body;
  db.prepare(`
    UPDATE servers SET name=?, host=?, port=?, username=?, auth_type=?,
    password=COALESCE(?, password), private_key=COALESCE(?, private_key),
    passphrase=COALESCE(?, passphrase), tags=? WHERE id=?
  `).run(name, host, port, username, auth_type,
    password || null, private_key || null, passphrase || null,
    JSON.stringify(tags || []), req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM servers WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

router.post('/:id/test', async (req, res) => {
  const server = db.prepare('SELECT * FROM servers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!server) return res.status(404).json({ error: 'Not found' });
  try {
    await testConnection(server);
    res.json({ ok: true, message: 'Connection successful' });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
});

module.exports = router;
