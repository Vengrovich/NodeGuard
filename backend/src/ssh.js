const { Client } = require('ssh2');

function buildConnectConfig(server) {
  const config = {
    host: server.host,
    port: server.port || 22,
    username: server.username,
    readyTimeout: 10000,
    keepaliveInterval: 10000
  };
  if (server.auth_type === 'key') {
    config.privateKey = server.private_key;
    if (server.passphrase) config.passphrase = server.passphrase;
  } else {
    config.password = server.password;
  }
  return config;
}

function testConnection(server) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => { conn.destroy(); reject(new Error('Connection timeout')); }, 12000);
    conn.on('ready', () => { clearTimeout(timer); conn.end(); resolve(); })
      .on('error', err => { clearTimeout(timer); reject(err); })
      .connect(buildConnectConfig(server));
  });
}

function execCommand(server, command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '', stderr = '';
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) { conn.end(); return reject(err); }
        stream.on('close', () => { conn.end(); resolve({ stdout, stderr }); })
          .on('data', d => { stdout += d; })
          .stderr.on('data', d => { stderr += d; });
      });
    }).on('error', reject).connect(buildConnectConfig(server));
  });
}

const METRICS_CMD = `
echo "===CPU===";
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | tr -d '%us,';
cat /proc/loadavg;
echo "===MEM===";
free -m | awk '/^Mem:/{print $2,$3,$4}';
echo "===DISK===";
df -h / | awk 'NR==2{print $2,$3,$5}';
echo "===NET===";
cat /proc/net/dev | awk 'NR>2{gsub(/:/,"",$1); if($1!="lo") print $1,$2,$10}' | head -1;
echo "===UPTIME===";
uptime -p;
echo "===DOCKER===";
docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}' 2>/dev/null || echo "no-docker";
echo "===WG===";
wg show 2>/dev/null || echo "no-wg";
echo "===PORTS===";
ss -tlunp 2>/dev/null | awk 'NR>1{print $1,$5,$7}' | head -20;
echo "===UFW===";
ufw status numbered 2>/dev/null || echo "no-ufw";
echo "===HOSTNAME===";
hostname; uname -r; lsb_release -ds 2>/dev/null || grep PRETTY_NAME /etc/os-release | cut -d= -f2 | tr -d '"';
`.trim();

function parseMetrics(raw) {
  const sections = {};
  let current = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith('===') && line.endsWith('===')) {
      current = line.replace(/===/g, '').trim();
      sections[current] = [];
    } else if (current && line.trim()) {
      sections[current].push(line.trim());
    }
  }

  const cpuLines = sections['CPU'] || [];
  const loadParts = (cpuLines[1] || '').split(' ');
  const memParts = (sections['MEM']?.[0] || '').split(' ');
  const diskParts = (sections['DISK']?.[0] || '').split(' ');
  const netParts = (sections['NET']?.[0] || '').split(' ');

  const docker = (sections['DOCKER'] || []).map(l => {
    if (l === 'no-docker') return null;
    const [name, image, ...statusParts] = l.split('|');
    return { name, image, status: statusParts.join(' ') };
  }).filter(Boolean);

  const wgRaw = sections['WG'] || [];
  const wgPeers = [];
  let currentPeer = null;
  for (const line of wgRaw) {
    if (line === 'no-wg') break;
    if (line.startsWith('peer:')) {
      if (currentPeer) wgPeers.push(currentPeer);
      currentPeer = { pubkey: line.replace('peer:', '').trim() };
    } else if (currentPeer) {
      if (line.includes('allowed ips:')) currentPeer.allowedIps = line.split(':')[1]?.trim();
      if (line.includes('latest handshake:')) currentPeer.lastHandshake = line.split(':').slice(1).join(':').trim();
      if (line.includes('transfer:')) {
        const t = line.replace('transfer:', '').trim().split(',');
        currentPeer.rxBytes = t[0]?.trim();
        currentPeer.txBytes = t[1]?.trim();
      }
    }
  }
  if (currentPeer) wgPeers.push(currentPeer);

  const ports = (sections['PORTS'] || []).map(l => {
    const parts = l.split(/\s+/);
    return { proto: parts[0], addr: parts[1], process: parts[2] };
  });

  const ufwRules = (sections['UFW'] || [])
    .filter(l => l.match(/^\[\s*\d+\]/))
    .map(l => {
      const m = l.match(/\[\s*(\d+)\]\s+(\S+)\s+(ALLOW|DENY|REJECT|LIMIT)\s+(.*)/i);
      if (!m) return null;
      return { num: m[1], port: m[2], action: m[3].toUpperCase(), from: m[4]?.trim() || 'Anywhere' };
    }).filter(Boolean);

  const hostLines = sections['HOSTNAME'] || [];

  return {
    cpu: {
      usage: parseFloat(cpuLines[0]) || 0,
      load1: parseFloat(loadParts[0]) || 0,
      load5: parseFloat(loadParts[1]) || 0,
      load15: parseFloat(loadParts[2]) || 0
    },
    memory: {
      total: parseInt(memParts[0]) || 0,
      used: parseInt(memParts[1]) || 0,
      free: parseInt(memParts[2]) || 0
    },
    disk: {
      total: diskParts[0] || '?',
      used: diskParts[1] || '?',
      usedPercent: parseInt(diskParts[2]) || 0
    },
    network: {
      iface: netParts[0] || 'eth0',
      rxBytes: parseInt(netParts[1]) || 0,
      txBytes: parseInt(netParts[2]) || 0
    },
    uptime: (sections['UPTIME'] || [])[0] || '',
    docker,
    wgPeers,
    ports,
    ufwRules,
    hostname: hostLines[0] || '',
    kernel: hostLines[1] || '',
    os: hostLines[2] || ''
  };
}

module.exports = { testConnection, execCommand, buildConnectConfig, METRICS_CMD, parseMetrics };
