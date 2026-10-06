// Lets the Avolites machine find the LED screen machine on its own, so nobody
// has to type IP addresses on show day.
//
// The hub broadcasts a tiny UDP message every 2 s; the agent listens and uses
// the sender's address. The access key is never broadcast.

const dgram = require('node:dgram');
const os = require('node:os');

const DISCOVERY_PORT = 8099;
const APP_ID = 'talent-buzzer';

function encode(hubPort) {
  return Buffer.from(JSON.stringify({ app: APP_ID, port: hubPort }));
}

// Returns the hub port from an announcement, or null if it isn't one of ours.
function parse(buf) {
  try {
    const msg = JSON.parse(buf.toString());
    if (msg && msg.app === APP_ID && Number.isInteger(msg.port) && msg.port > 0 && msg.port < 65536) return msg.port;
  } catch {}
  return null;
}

// Directed broadcast address for each LAN interface (Windows only sends
// 255.255.255.255 out of one interface, so send to each subnet as well).
function broadcastAddresses() {
  const out = new Set(['255.255.255.255']);
  for (const iface of Object.values(os.networkInterfaces()).flat()) {
    if (!iface || iface.family !== 'IPv4' || iface.internal || !iface.netmask) continue;
    const ip = iface.address.split('.').map(Number);
    const mask = iface.netmask.split('.').map(Number);
    out.add(ip.map((b, i) => (b | (~mask[i] & 255))).join('.'));
  }
  return [...out];
}

function announce(hubPort, intervalMs = 2000) {
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const payload = encode(hubPort);
  const tick = () => {
    for (const addr of broadcastAddresses()) sock.send(payload, DISCOVERY_PORT, addr, () => {});
  };
  sock.bind(() => {
    sock.setBroadcast(true);
    tick();
  });
  sock.on('error', () => {});
  const timer = setInterval(tick, intervalMs);
  return () => {
    clearInterval(timer);
    sock.close();
  };
}

// Calls onHub("ip:port") for every announcement heard.
function listen(onHub) {
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  sock.on('message', (buf, rinfo) => {
    const port = parse(buf);
    if (port) onHub(`${rinfo.address}:${port}`);
  });
  sock.on('error', (err) => console.error(`Discovery listener error: ${err.message}`));
  sock.bind(DISCOVERY_PORT);
  return () => sock.close();
}

module.exports = { DISCOVERY_PORT, encode, parse, broadcastAddresses, announce, listen };
