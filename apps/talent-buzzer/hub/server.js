#!/usr/bin/env node
// Talent show buzzer hub. Runs on the LED screen machine.
//
// Serves the tablet, display and control pages, holds show state, and relays
// every accepted press to the display (X + audio) and to the lighting
// (Avolites agent over WebSocket, or the Titan Web API directly).

const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { WebSocketServer } = require('ws');
const { ShowState } = require('../lib/state');
const titanApi = require('../lib/titan');

const APP_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- config ----------

function loadConfig() {
  const argPath = process.argv.find((a) => a.startsWith('--config='))?.slice('--config='.length);
  const candidates = [argPath, path.join(APP_DIR, 'config.json'), path.join(APP_DIR, 'config.example.json')].filter(Boolean);
  const file = candidates.find((f) => fs.existsSync(f));
  if (!file) throw new Error('No config.json found');
  if (file.endsWith('config.example.json')) log('⚠️ ', 'No config.json yet, using config.example.json (copy it to config.json to customise)');
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (process.env.PORT) config.hubPort = Number(process.env.PORT);
  return { config, file };
}

function log(icon, ...msg) {
  const t = new Date().toLocaleTimeString('en-GB', { hour12: false });
  console.log(`[${t}] ${icon}`, ...msg);
}

const { config, file: configFile } = loadConfig();
const seats = config.judges.map((j) => String(j.seat));
const state = new ShowState({ seats, debounceMs: config.debounceMs });
const lightingMode = config.lighting?.mode ?? 'agent'; // agent | direct | off

// ---------- static files ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

const ROUTES = { '/': '/control.html', '/tablet': '/tablet.html', '/display': '/display.html', '/control': '/control.html' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const pathname = ROUTES[url.pathname] ?? url.pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(decodeURIComponent(pathname)));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------- websocket ----------

const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set(); // { ws, role, seat?, info }
const lighting = { agentConnected: false, titanOk: null, titanVersion: null, lastError: null, log: [] };

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

function broadcast(msg, roles) {
  for (const c of clients) if (!roles || roles.includes(c.role)) send(c.ws, msg);
}

function presence() {
  const tablets = Object.fromEntries([...seats, 'gold'].map((s) => [s, 0]));
  let displays = 0;
  let displaysArmed = 0;
  for (const c of clients) {
    if (c.role === 'tablet' && c.seat in tablets) tablets[c.seat]++;
    if (c.role === 'display') {
      displays++;
      if (c.info.audioArmed) displaysArmed++;
    }
  }
  const agents = [...clients].filter((c) => c.role === 'agent').length;
  lighting.agentConnected = agents > 0;
  return { tablets, displays, displaysArmed, agents };
}

function fullState() {
  return {
    type: 'state',
    show: state.snapshot(),
    presence: presence(),
    lighting: { mode: lightingMode, ...lighting, log: lighting.log.slice(-15) },
  };
}

function pushState() {
  broadcast(fullState());
}

function welcome() {
  return {
    type: 'welcome',
    judges: config.judges.map((j) => ({ seat: String(j.seat), name: j.name })),
    golden: { name: config.golden?.name ?? 'Golden Buzzer' },
    cues: config.cues,
  };
}

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://x');
  if (config.key && url.searchParams.get('key') !== config.key) {
    log('🚫', `Rejected connection from ${req.socket.remoteAddress} (wrong or missing key)`);
    ws.close(4001, 'bad key');
    return;
  }
  const client = { ws, role: 'unknown', seat: null, info: {}, addr: req.socket.remoteAddress };
  clients.add(client);
  ws.isAlive = true;
  ws.on('pong', () => (ws.isAlive = true));

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    handleMessage(client, msg);
  });

  ws.on('close', () => {
    clients.delete(client);
    if (client.role !== 'unknown') log('🔌', `${describe(client)} disconnected`);
    if (client.role === 'agent' && lightingMode === 'agent' && presence().agents === 0) lighting.titanOk = null;
    pushState();
  });
});

function describe(c) {
  if (c.role === 'tablet') return c.seat === 'gold' ? 'Golden tablet' : `Tablet ${c.seat}`;
  return `${c.role[0].toUpperCase()}${c.role.slice(1)} (${c.addr})`;
}

function handleMessage(client, msg) {
  switch (msg.type) {
    case 'hello': {
      const role = ['tablet', 'display', 'control', 'agent'].includes(msg.role) ? msg.role : 'unknown';
      client.role = role;
      if (role === 'tablet') client.seat = String(msg.seat);
      log('✅', `${describe(client)} connected`);
      send(client.ws, welcome());
      if (role === 'agent') send(client.ws, { type: 'agent-config', titan: config.titan });
      pushState();
      break;
    }
    case 'press': {
      if (client.role !== 'tablet') return;
      if (client.seat === 'gold') goldenPress(`Golden tablet`);
      else judgePress(client.seat, `Tablet ${client.seat}`);
      break;
    }
    case 'display-status': {
      if (client.role !== 'display') return;
      client.info.audioArmed = Boolean(msg.audioArmed);
      pushState();
      break;
    }
    case 'agent-status': {
      if (client.role !== 'agent') return;
      const changed = lighting.titanOk !== msg.titanOk;
      lighting.titanOk = msg.titanOk;
      lighting.titanVersion = msg.version ?? null;
      if (msg.error) lighting.lastError = msg.error;
      if (changed) {
        log(msg.titanOk ? '💡' : '⚠️ ', msg.titanOk ? `Titan reachable (${msg.version})` : `Titan NOT reachable: ${msg.error}`);
        pushState();
      }
      break;
    }
    case 'fire-result': {
      if (client.role !== 'agent') return;
      recordFire(msg.label, msg.userNumber, msg.ok, msg.error);
      break;
    }
    // ----- operator actions (control page only) -----
    case 'trigger': {
      if (client.role !== 'control') return;
      if (msg.seat === 'gold') goldenPress('Control (manual)');
      else judgePress(String(msg.seat), 'Control (manual)');
      break;
    }
    case 'reset': {
      if (client.role !== 'control') return;
      state.reset();
      log('🔄', 'Reset');
      broadcast({ type: 'event', kind: 'reset' });
      if (config.cues.releaseOnReset) {
        for (const n of new Set([...Object.values(config.cues.x ?? {}), config.cues.golden, config.cues.allX].filter((n) => n != null))) {
          fireLighting(n, 'Release', 'release');
        }
      }
      if (config.cues.reset != null) fireLighting(config.cues.reset, 'Reset');
      pushState();
      break;
    }
    case 'lock': {
      if (client.role !== 'control') return;
      state.setLocked(msg.locked);
      log(state.locked ? '🔒' : '🔓', state.locked ? 'Buzzers locked' : 'Buzzers unlocked');
      pushState();
      break;
    }
    case 'test-lighting': {
      if (client.role !== 'control') return;
      const n = Number(msg.userNumber);
      if (Number.isFinite(n)) fireLighting(n, `Test ${msg.label ?? ''}`.trim());
      break;
    }
    case 'test-sound': {
      if (client.role !== 'control') return;
      broadcast({ type: 'test-sound', kind: ['golden', 'all-x'].includes(msg.kind) ? msg.kind : 'x' }, ['display']);
      break;
    }
  }
}

function judgePress(seat, source) {
  const result = state.press(seat);
  if (!result.accepted) {
    log('·', `${source} press ignored (${result.reason})`);
    return;
  }
  log('❌', `X from judge ${seat} (${source})`);
  broadcast({ type: 'event', kind: 'x', seat, at: Date.now() });
  const cue = config.cues.x?.[seat];
  if (cue != null) fireLighting(cue, `X judge ${seat}`);
  if (state.allX()) {
    log('🚨', 'All judges have buzzed');
    broadcast({ type: 'event', kind: 'all-x', at: Date.now() });
    if (config.cues.allX != null) fireLighting(config.cues.allX, 'All X');
  }
  pushState();
}

function goldenPress(source) {
  const result = state.pressGolden();
  if (!result.accepted) {
    log('·', `${source} golden press ignored (${result.reason})`);
    return;
  }
  log('🌟', `GOLDEN BUZZER (${source})`);
  broadcast({ type: 'event', kind: 'golden', at: Date.now() });
  if (config.cues.golden != null) fireLighting(config.cues.golden, 'Golden');
  pushState();
}

// ---------- lighting ----------

function recordFire(label, userNumber, ok, error) {
  lighting.log.push({ at: Date.now(), label, userNumber, ok, error: error ?? null });
  if (lighting.log.length > 50) lighting.log.shift();
  if (!ok) lighting.lastError = error;
  log(ok ? '💡' : '🔥', `Cue ${label} -> playback ${userNumber}: ${ok ? 'OK' : `FAILED (${error})`}`);
  pushState();
}

function fireLighting(userNumber, label, action = 'fire') {
  if (lightingMode === 'off') return;
  if (lightingMode === 'direct') {
    titanApi.fireCue(config.titan, userNumber, action).then(
      () => recordFire(label, userNumber, true),
      (err) => recordFire(label, userNumber, false, err.message),
    );
    return;
  }
  const agents = [...clients].filter((c) => c.role === 'agent');
  if (agents.length === 0) {
    recordFire(label, userNumber, false, 'Avolites agent not connected');
    return;
  }
  for (const a of agents) send(a.ws, { type: 'fire', userNumber, label, action });
}

if (lightingMode === 'direct') {
  const poll = async () => {
    try {
      const version = await titanApi.checkHealth(config.titan);
      if (lighting.titanOk !== true) log('💡', `Titan reachable at ${config.titan.host} (${version})`);
      lighting.titanOk = true;
      lighting.titanVersion = version;
    } catch (err) {
      if (lighting.titanOk !== false) log('⚠️ ', `Titan NOT reachable at ${config.titan.host}: ${err.message}`);
      lighting.titanOk = false;
      lighting.lastError = err.message;
    }
    pushState();
  };
  poll();
  setInterval(poll, 5000);
}

// Drop dead connections (tablet went to sleep, Wi-Fi dropped) so presence is honest.
setInterval(() => {
  for (const c of clients) {
    if (!c.ws.isAlive) {
      c.ws.terminate();
      continue;
    }
    c.ws.isAlive = false;
    c.ws.ping();
  }
}, 5000);

// ---------- start ----------

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

server.listen(config.hubPort, () => {
  const k = config.key ? `key=${encodeURIComponent(config.key)}` : '';
  const q = (extra) => [extra, k].filter(Boolean).join('&');
  log('🎤', `Talent buzzer hub running (config: ${path.relative(process.cwd(), configFile) || configFile})`);
  log('💡', `Lighting mode: ${lightingMode}${lightingMode === 'direct' ? ` -> Titan at ${config.titan.host}:${config.titan.port}` : ''}`);
  for (const ip of lanAddresses().length ? lanAddresses() : ['localhost']) {
    const base = `http://${ip}:${config.hubPort}`;
    console.log(`\n  Control:  ${base}/control${k ? `?${k}` : ''}`);
    console.log(`  Display:  ${base}/display${k ? `?${k}` : ''}`);
    for (const s of seats) console.log(`  Judge ${s}:  ${base}/tablet?${q(`seat=${s}`)}`);
    console.log(`  Golden:   ${base}/tablet?${q('seat=gold')}`);
    if (lightingMode === 'agent') console.log(`  Agent:    node agent/avolites-agent.js ${ip}:${config.hubPort}${config.key ? ` --key=${config.key}` : ''}`);
  }
  console.log('');
});
