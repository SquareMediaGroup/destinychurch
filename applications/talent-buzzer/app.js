#!/usr/bin/env node
// Talent buzzer launcher. The same app goes on both machines; this asks which
// machine it is (LED screen or Avolites) on a setup page, remembers the answer
// in machine.json, and runs the right part:
//
//   LED screen machine -> hub/server.js        (tablets, display, control page)
//   Avolites machine   -> agent/avolites-agent.js (fires Titan playbacks)
//
// The chosen part runs as a child process and is restarted if it crashes.
//
//   node app.js [--no-open] [--dir=<folder for machine.json>] [--setup-port=8090]

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { fork, exec } = require('node:child_process');

const args = process.argv.slice(2);
const arg = (name) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const DATA_DIR = path.resolve(arg('dir') ?? __dirname);
const MACHINE_FILE = path.join(DATA_DIR, 'machine.json');
const SETUP_PORT = Number(arg('setup-port') ?? 8090);
const OPEN_BROWSER = !args.includes('--no-open');

const ROLES = {
  screen: { name: 'LED screen machine', script: path.join(__dirname, 'hub', 'server.js') },
  avolites: { name: 'Avolites machine', script: path.join(__dirname, 'agent', 'avolites-agent.js') },
};

function log(icon, ...msg) {
  const t = new Date().toLocaleTimeString('en-GB', { hour12: false });
  console.log(`[${t}] ${icon}`, ...msg);
}

function readMachine() {
  try {
    const m = JSON.parse(fs.readFileSync(MACHINE_FILE, 'utf8'));
    return ROLES[m.role] ? m : {};
  } catch {
    return {};
  }
}

let machine = readMachine();
let child = null;
let childInfo = {}; // latest status the child reported
let stopping = false;
let crashes = [];

function startRole() {
  const role = ROLES[machine.role];
  if (!role) return;
  const childArgs = [];
  if (machine.role === 'avolites') {
    if (machine.hubAddress) childArgs.push(machine.hubAddress);
    if (machine.key) childArgs.push(`--key=${machine.key}`);
  }
  log('🚀', `Starting as ${role.name}`);
  childInfo = {};
  stopping = false;
  child = fork(role.script, childArgs, { cwd: __dirname });
  child.on('message', (msg) => {
    if (msg && typeof msg === 'object') childInfo = { ...childInfo, ...msg };
  });
  child.on('exit', (code) => {
    child = null;
    if (stopping) return;
    // Restart after a crash, but don't spin if it fails straight away every time.
    const now = Date.now();
    crashes = crashes.filter((t) => now - t < 30000).concat(now);
    const delay = crashes.length > 3 ? 5000 : 1000;
    childInfo = { crashed: true, exitCode: code };
    log('⚠️ ', `${role.name} stopped (code ${code}), restarting in ${delay / 1000}s`);
    setTimeout(() => !child && !stopping && startRole(), delay);
  });
}

function stopRole() {
  return new Promise((resolve) => {
    if (!child) return resolve();
    stopping = true;
    child.once('exit', () => resolve());
    child.kill();
  });
}

async function setMachine(next) {
  await stopRole();
  machine = next;
  fs.writeFileSync(MACHINE_FILE, JSON.stringify(machine, null, 2) + '\n');
  log('💾', `This machine is now: ${ROLES[machine.role].name}`);
  startRole();
}

// ---------- setup page (this machine only) ----------

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c.length < 10000 ? c : ''));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const setup = http.createServer(async (req, res) => {
  // Refuse anything not addressed to this machine by name (DNS rebinding).
  const host = (req.headers.host ?? '').replace(/:\d+$/, '');
  if (host !== 'localhost' && host !== '127.0.0.1') {
    res.writeHead(403).end();
    return;
  }
  const json = (code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    fs.createReadStream(path.join(__dirname, 'setup', 'setup.html')).pipe(res);
  } else if (req.method === 'GET' && req.url === '/api/state') {
    json(200, {
      role: machine.role ?? null,
      roleName: ROLES[machine.role]?.name ?? null,
      hubAddress: machine.hubAddress ?? '',
      hasKey: Boolean(machine.key),
      running: Boolean(child),
      info: childInfo,
    });
  } else if (req.method === 'POST' && req.url === '/api/machine') {
    // Only accept requests from a page served by this setup server.
    const origin = req.headers.origin;
    if (origin && origin !== `http://localhost:${SETUP_PORT}` && origin !== `http://127.0.0.1:${SETUP_PORT}`) return json(403, { error: 'forbidden' });
    const body = await readBody(req);
    if (!ROLES[body.role]) return json(400, { error: 'unknown role' });
    const next = { role: body.role };
    if (body.role === 'avolites') {
      if (typeof body.hubAddress === 'string' && body.hubAddress.trim()) next.hubAddress = body.hubAddress.trim();
      if (typeof body.key === 'string' && body.key) next.key = body.key;
      else if (body.keepKey && machine.key) next.key = machine.key;
    }
    await setMachine(next);
    json(200, { ok: true });
  } else {
    res.writeHead(404).end();
  }
});

function openBrowser(url) {
  if (!OPEN_BROWSER) return;
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

setup.on('error', (err) => {
  log('🔥', err.code === 'EADDRINUSE' ? `Port ${SETUP_PORT} is in use - is Talent Buzzer already running on this machine?` : err.message);
  process.exit(1);
});

setup.listen(SETUP_PORT, '127.0.0.1', () => {
  const url = `http://localhost:${SETUP_PORT}`;
  log('🎤', `Talent Buzzer setup page: ${url}`);
  if (machine.role) startRole();
  else log('❓', 'No role chosen yet - pick one on the setup page');
  openBrowser(url);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await stopRole();
    process.exit(0);
  });
}
