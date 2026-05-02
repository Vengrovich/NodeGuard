import React, { useState } from 'react'
import { useStore } from '../../store'
import { useSocket } from '../../hooks/useSocket'
import { X, Loader, Terminal, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'

const PROTOCOLS = [
  // ── WireGuard family ──────────────────────────────────────────────────────
  {
    category: 'WireGuard',
    name: 'AmneziaWG',
    matchImages: ['amneziawg', 'amneziavpn'],
    matchNames: ['amnezia', 'awg'],
    port: '51820/udp', color: '#39d353',
    desc: 'Обфусцированный WireGuard — обходит DPI и блокировки',
    installCmd: `docker run -d --name amnezia-awg \\\n  --cap-add NET_ADMIN --cap-add SYS_MODULE \\\n  -p 51820:51820/udp \\\n  -v /opt/amnezia/awg:/opt/amneziawg/data \\\n  --restart unless-stopped \\\n  amneziavpn/amneziawg`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/amnezia-vpn/amnezia-wg',
  },
  {
    category: 'WireGuard',
    name: 'WireGuard (wg-easy)',
    matchImages: ['wg-easy', 'wireguard'],
    matchNames: ['wg-easy', 'wireguard'],
    port: '51820/udp + 51821/tcp (UI)', color: '#39d353',
    desc: 'WireGuard с красивым веб-интерфейсом',
    installCmd: `docker run -d --name wg-easy \\\n  --cap-add NET_ADMIN --cap-add SYS_MODULE \\\n  -e WG_HOST=$(curl -s ifconfig.me) \\\n  -e PASSWORD=changeme \\\n  -p 51820:51820/udp -p 51821:51821/tcp \\\n  -v ~/.wg-easy:/etc/wireguard \\\n  --restart unless-stopped \\\n  ghcr.io/wg-easy/wg-easy`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/wg-easy/wg-easy',
  },
  // ── Xray / V2Ray family ───────────────────────────────────────────────────
  {
    category: 'Xray / V2Ray',
    name: 'XRay Core',
    matchImages: ['xray', 'teddysun/xray', 'xtls'],
    matchNames: ['xray', 'xtls'],
    port: '443/tcp', color: '#bc8cff',
    desc: 'VLESS / VMESS / Reality / XTLS — современный обход',
    installCmd: `docker run -d --name xray \\\n  -p 443:443 \\\n  -v /etc/xray:/etc/xray \\\n  --restart unless-stopped \\\n  teddysun/xray`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/XTLS/Xray-core',
  },
  {
    category: 'Xray / V2Ray',
    name: '3X-UI Panel',
    matchImages: ['3x-ui', 'mhsanaei', 'x-ui'],
    matchNames: ['3x-ui', 'x-ui', 'xui'],
    port: '2053/tcp (panel)', color: '#bc8cff',
    desc: 'Веб-панель для управления XRay (VLESS/VMESS/Trojan)',
    installCmd: `docker run -d --name 3x-ui \\\n  -p 2053:2053 \\\n  -v /etc/x-ui:/etc/x-ui \\\n  --restart unless-stopped \\\n  ghcr.io/mhsanaei/3x-ui`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/MHSanaei/3x-ui',
  },
  {
    category: 'Xray / V2Ray',
    name: 'V2Ray',
    matchImages: ['v2ray', 'v2fly'],
    matchNames: ['v2ray', 'v2fly'],
    port: '10086/tcp', color: '#bc8cff',
    desc: 'Классический V2Ray (VMess/VLESS)',
    installCmd: `docker run -d --name v2ray \\\n  -p 10086:10086 \\\n  -v /etc/v2ray:/etc/v2ray \\\n  --restart unless-stopped \\\n  v2fly/v2fly-core`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/v2fly/v2ray-core',
  },
  // ── Shadowsocks family ────────────────────────────────────────────────────
  {
    category: 'Shadowsocks',
    name: 'Shadowsocks',
    matchImages: ['shadowsocks-libev', 'shadowsocks/'],
    matchNames: ['shadowsocks', 'ss-server'],
    port: '8388/tcp+udp', color: '#56d364',
    desc: 'Классический прокси-протокол',
    installCmd: `docker run -d --name shadowsocks \\\n  -p 8388:8388 -p 8388:8388/udp \\\n  -e PASSWORD=$(openssl rand -base64 12) \\\n  -e METHOD=aes-256-gcm \\\n  --restart unless-stopped \\\n  shadowsocks/shadowsocks-libev`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/shadowsocks/shadowsocks-libev',
  },
  {
    category: 'Shadowsocks',
    name: 'Shadowsocks-Rust',
    matchImages: ['shadowsocks-rust', 'ssserver-rust'],
    matchNames: ['ssserver', 'ss-rust'],
    port: '8388/tcp+udp', color: '#56d364',
    desc: 'Быстрая реализация Shadowsocks на Rust',
    installCmd: `docker run -d --name ss-rust \\\n  -p 8388:8388 -p 8388:8388/udp \\\n  -v /etc/shadowsocks-rust:/etc/shadowsocks-rust \\\n  --restart unless-stopped \\\n  ghcr.io/shadowsocks/ssserver-rust`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/shadowsocks/shadowsocks-rust',
  },
  {
    category: 'Shadowsocks',
    name: 'Outline',
    matchImages: ['shadowbox', 'outline'],
    matchNames: ['shadowbox', 'outline'],
    port: 'random', color: '#56d364',
    desc: 'VPN от Jigsaw/Google на базе Shadowsocks',
    installCmd: `bash -c "$(wget -qO- https://raw.githubusercontent.com/Jigsaw-Code/outline-server/master/src/server_manager/install_scripts/install_server.sh)"`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://getoutline.org',
  },
  // ── Telegram proxy ────────────────────────────────────────────────────────
  {
    category: 'Telegram',
    name: 'MTProxy',
    matchImages: ['telegrammessenger/proxy', 'mtproto', 'mtproxy'],
    matchNames: ['mtproxy', 'mtproto', 'telegram-proxy'],
    port: '443/tcp', color: '#58a6ff',
    desc: 'Официальный прокси Telegram (MTProto)',
    installCmd: `docker run -d --name mtproxy \\\n  -p 443:443 -p 8888:8888 \\\n  -e SECRET=$(openssl rand -hex 16) \\\n  --restart unless-stopped \\\n  telegrammessenger/proxy`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/TelegramMessenger/MTProxy',
  },
  {
    category: 'Telegram',
    name: 'MTProto-Proxy (Go)',
    matchImages: ['mtprotoproxy', 'alexdunk/mtproto'],
    matchNames: ['mtprotoproxy'],
    port: '443/tcp', color: '#58a6ff',
    desc: 'Быстрый MTProto прокси на Go',
    installCmd: `docker run -d --name mtprotoproxy \\\n  -p 443:443 \\\n  -e SECRET=$(openssl rand -hex 16) \\\n  --restart unless-stopped \\\n  alexdunk/mtprotoproxy`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/alexbers/mtprotoproxy',
  },
  // ── OpenVPN ───────────────────────────────────────────────────────────────
  {
    category: 'OpenVPN',
    name: 'OpenVPN',
    matchImages: ['openvpn', 'kylemanna/openvpn'],
    matchNames: ['openvpn'],
    port: '1194/udp', color: '#f85149',
    desc: 'Классический OpenVPN',
    installCmd: `# Инициализация конфига\ndocker run -v /etc/openvpn:/etc/openvpn --rm kylemanna/openvpn ovpn_genconfig -u udp://$(curl -s ifconfig.me)\ndocker run -v /etc/openvpn:/etc/openvpn --rm -it kylemanna/openvpn ovpn_initpki\n\n# Запуск\ndocker run -d --name openvpn \\\n  --cap-add NET_ADMIN \\\n  -p 1194:1194/udp \\\n  -v /etc/openvpn:/etc/openvpn \\\n  --restart unless-stopped \\\n  kylemanna/openvpn`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/kylemanna/docker-openvpn',
  },
  // ── Trojan ────────────────────────────────────────────────────────────────
  {
    category: 'Trojan',
    name: 'Trojan-Go',
    matchImages: ['trojan-go', 'p4gefau1t/trojan-go'],
    matchNames: ['trojan', 'trojan-go'],
    port: '443/tcp', color: '#e3b341',
    desc: 'Trojan — имитирует HTTPS трафик',
    installCmd: `docker run -d --name trojan-go \\\n  -p 443:443 \\\n  -v /etc/trojan-go:/etc/trojan-go \\\n  --restart unless-stopped \\\n  p4gefau1t/trojan-go`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/p4gefau1t/trojan-go',
  },
  // ── SOCKS5 / HTTP proxy ───────────────────────────────────────────────────
  {
    category: 'Proxy',
    name: 'Dante SOCKS5',
    matchImages: ['dante', 'vimagick/dante'],
    matchNames: ['dante', 'socks5'],
    port: '1080/tcp', color: '#8b949e',
    desc: 'SOCKS5 прокси сервер',
    installCmd: `docker run -d --name dante-socks5 \\\n  -p 1080:1080 \\\n  --restart unless-stopped \\\n  vimagick/dante`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://github.com/vimagick/dockerfiles/tree/master/dante',
  },
  {
    category: 'Proxy',
    name: 'Squid HTTP Proxy',
    matchImages: ['squid', 'ubuntu/squid'],
    matchNames: ['squid'],
    port: '3128/tcp', color: '#8b949e',
    desc: 'HTTP/HTTPS прокси сервер',
    installCmd: `docker run -d --name squid \\\n  -p 3128:3128 \\\n  --restart unless-stopped \\\n  ubuntu/squid`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'http://www.squid-cache.org',
  },
  // ── Tor ───────────────────────────────────────────────────────────────────
  {
    category: 'Tor',
    name: 'Tor SOCKS',
    matchImages: ['tor', 'dperson/torproxy'],
    matchNames: ['tor', 'torproxy'],
    port: '9050/tcp', color: '#7c3aed',
    desc: 'Анонимная сеть Tor (SOCKS5)',
    installCmd: `docker run -d --name torproxy \\\n  -p 9050:9050 -p 8118:8118 \\\n  --restart unless-stopped \\\n  dperson/torproxy`,
    removeCmd: (name) => `docker stop ${name} && docker rm ${name}`,
    docs: 'https://www.torproject.org',
  },
]

const CATEGORIES = [...new Set(PROTOCOLS.map(p => p.category))]

function matchProtocol(proto, docker) {
  return docker.find(c => {
    const img = c.image.toLowerCase()
    const name = (c.name || '').toLowerCase()
    return (
      proto.matchImages.some(m => img.includes(m.toLowerCase())) ||
      proto.matchNames.some(m => name.includes(m.toLowerCase()))
    )
  })
}

export default function ProtocolsTab({ serverId }) {
  const metrics = useStore(s => s.metrics[serverId])
  const { execCommand } = useSocket()
  const [modal, setModal] = useState(null) // { proto, mode: 'install'|'remove' }
  const [log, setLog] = useState('')
  const [running, setRunning] = useState(false)
  const [filterCat, setFilterCat] = useState('ALL')

  if (!metrics) return <div className="text-muted text-sm p-4">Загрузка метрик...</div>

  const docker = metrics.docker || []

  const withStatus = PROTOCOLS.map(p => ({
    ...p,
    container: matchProtocol(p, docker),
  }))

  const active = withStatus.filter(p => p.container)
  const inactive = withStatus.filter(p => !p.container)
  const filtered = filterCat === 'ALL' ? inactive : inactive.filter(p => p.category === filterCat)

  async function runCmd(cmd) {
    setRunning(true)
    setLog('Выполняется...\n')
    const result = await execCommand(serverId, cmd)
    setLog((result.stdout || '') + (result.stderr || '') + (result.error ? `\nОШИБКА: ${result.error}` : ''))
    setRunning(false)
  }

  function openInstall(proto) { setModal({ proto, mode: 'install' }); setLog('') }
  function openRemove(proto, container) { setModal({ proto, mode: 'remove', container }); setLog('') }
  function closeModal() { setModal(null); setLog('') }

  return (
    <div className="space-y-4">
      {/* Active */}
      {active.length > 0 && (
        <Section title={`АКТИВНЫЕ ПРОТОКОЛЫ (${active.length})`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {active.map(p => (
              <ActiveCard key={p.name} proto={p}
                onRemove={() => openRemove(p, p.container)} />
            ))}
          </div>
        </Section>
      )}

      {/* Available */}
      <Section title="ДОСТУПНЫ ДЛЯ УСТАНОВКИ">
        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {['ALL', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors
                ${filterCat === cat ? 'border-blue/50 bg-blue/10 text-blue' : 'border-border-default text-muted hover:text-white'}`}>
              {cat}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(p => (
            <InactiveCard key={p.name} proto={p} onInstall={() => openInstall(p)} />
          ))}
        </div>
      </Section>

      {/* Ports */}
      {metrics.ports?.length > 0 && (
        <Section title="ОТКРЫТЫЕ ПОРТЫ">
          <div className="space-y-1.5">
            {metrics.ports.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-xs font-mono">
                <span className={`px-1.5 py-0.5 rounded border ${p.proto?.includes('tcp') ? 'text-blue border-blue/30 bg-blue/10' : 'text-amber border-amber/30 bg-amber/10'}`}>
                  {p.proto?.toUpperCase()}
                </span>
                <span className="text-white">{p.addr}</span>
                <span className="text-muted truncate">{p.process}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border-default rounded-lg w-full max-w-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
              <div>
                <div className="text-sm font-mono">
                  {modal.mode === 'install' ? '+ УСТАНОВКА' : '✕ УДАЛЕНИЕ'}: {modal.proto.name}
                </div>
                <div className="text-xs text-muted mt-0.5">{modal.proto.desc}</div>
              </div>
              <button onClick={closeModal} className="text-muted hover:text-white"><X size={16} /></button>
            </div>

            <div className="p-5 space-y-4">
              {modal.mode === 'install' ? (
                <>
                  <div>
                    <div className="text-xs text-muted tracking-widest mb-2">КОМАНДА УСТАНОВКИ</div>
                    <pre className="bg-bg-primary border border-border-default rounded p-3 text-xs font-mono text-green overflow-x-auto whitespace-pre-wrap">{modal.proto.installCmd}</pre>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => runCmd(modal.proto.installCmd)} disabled={running}
                      className="flex items-center gap-2 px-4 py-2 bg-green/10 hover:bg-green/20 border border-green/40 text-green rounded text-xs font-mono transition-colors disabled:opacity-50">
                      {running ? <Loader size={12} className="animate-spin" /> : <Terminal size={12} />}
                      {running ? 'Выполняется...' : 'Запустить на сервере'}
                    </button>
                    <a href={modal.proto.docs} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 border border-border-default rounded text-xs font-mono text-muted hover:text-white transition-colors">
                      <ExternalLink size={12} /> Документация
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs text-muted">
                    Будет выполнено: <span className="text-red font-mono">{`docker stop ${modal.container?.name} && docker rm ${modal.container?.name}`}</span>
                  </div>
                  <div className="p-3 bg-red/5 border border-red/20 rounded text-xs text-red">
                    ⚠ Это остановит и удалит контейнер <strong>{modal.container?.name}</strong>. Данные в volumes сохранятся.
                  </div>
                  <button onClick={() => runCmd(modal.proto.removeCmd(modal.container?.name))} disabled={running}
                    className="flex items-center gap-2 px-4 py-2 bg-red/10 hover:bg-red/20 border border-red/40 text-red rounded text-xs font-mono transition-colors disabled:opacity-50">
                    {running ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    {running ? 'Удаляется...' : 'Удалить контейнер'}
                  </button>
                </>
              )}

              {log && (
                <div>
                  <div className="text-xs text-muted tracking-widest mb-2">ВЫВОД</div>
                  <pre className="bg-bg-primary border border-border-default rounded p-3 text-xs font-mono text-green overflow-auto max-h-48 whitespace-pre-wrap">{log}</pre>
                </div>
              )}

              {modal.mode === 'install' && (
                <div className="text-xs text-muted border-t border-border-default pt-3">
                  ⚠ Метрики обновятся автоматически через ~5 сек после установки
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-xs text-muted tracking-widest mb-3">{title}</div>
      {children}
    </div>
  )
}

function ActiveCard({ proto, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-bg-secondary border border-border-hover rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: proto.color, boxShadow: `0 0 6px ${proto.color}` }} />
            <span className="font-mono text-sm font-medium">{proto.name}</span>
            <span className="text-xs text-muted border border-border-default rounded px-1.5">{proto.category}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-2 py-0.5 rounded border text-green border-green/30 bg-green/10">
              {proto.container.status}
            </span>
            <button onClick={onRemove}
              className="text-muted hover:text-red transition-colors p-1 rounded hover:bg-red/10" title="Удалить">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        <div className="text-xs text-muted mb-1">{proto.desc}</div>
        <div className="text-xs text-muted">Порт: {proto.port}</div>
      </div>
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-xs text-muted hover:text-white border-t border-border-default hover:bg-bg-tertiary transition-colors">
        {expanded ? <><ChevronUp size={12} /> Скрыть</> : <><ChevronDown size={12} /> {proto.container.name}</>}
      </button>
      {expanded && (
        <div className="px-4 pb-3 text-xs font-mono text-muted border-t border-border-default pt-2 space-y-1">
          <div>Image: <span className="text-white">{proto.container.image}</span></div>
          <div>Name: <span className="text-white">{proto.container.name}</span></div>
          <div>Status: <span className="text-green">{proto.container.status}</span></div>
        </div>
      )}
    </div>
  )
}

function InactiveCard({ proto, onInstall }) {
  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4 hover:border-border-hover transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-muted/30" />
          <span className="font-mono text-sm">{proto.name}</span>
          <span className="text-xs text-muted border border-border-default rounded px-1.5">{proto.category}</span>
        </div>
        <button onClick={onInstall}
          className="text-xs px-2 py-0.5 rounded border border-blue/40 bg-blue/10 text-blue hover:bg-blue/20 transition-colors font-mono">
          + Установить
        </button>
      </div>
      <div className="text-xs text-muted mb-1">{proto.desc}</div>
      <div className="text-xs text-muted">Порт: {proto.port}</div>
    </div>
  )
}
