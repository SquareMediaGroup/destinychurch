#!/usr/bin/env node
// Avolites agent. Runs on the Titan PC.
//
// Connects out to the hub (so the lighting PC needs no inbound firewall rule),
// and fires Titan playbacks through the Titan Web API on this machine.
//
//   node agent/avolites-agent.js <hub-ip>[:port] [--key=SECRET] [--titan-host=localhost]

const WebSocket = require('ws');
const titanApi = require('../lib/titan');

const args = process.argv.slice(2);
const hubArg = args.find((a) => !a.startsWith('--')) ?? process.env.HUB ?? 'localhost:8080';
const key = args.find((a) => a.startsWith('--key='))?.slice('--key='.length) ?? process.env.KEY ?? '';
const titanHostOverride = args.find((a) => a.startsWith('--titan-host='))?.slice('--titan-host='.length);

const hubHostPort = hubArg.replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
const hubUrl = `ws://${hubHostPort.includes(':') ? hubHostPort : `${hubHostPort}:8080`}/ws${key ? `?key=${encodeURIComponent(key)}` : ''}`;

let titan = null; // sent by the hub on connect, from its config.json
let ws = null;
let retryMs = 500;

function log(icon, ...msg) {
  const t = new Date().toLocaleTimeString('en-GB', { hour12: false });
  console.log(`[${t}] ${icon}`, ...msg);
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

async function reportHealth() {
  if (!titan) return;
  try {
    const version = await titanApi.checkHealth(titan);
    send({ type: 'agent-status', titanOk: true, version });
  } catch (err) {
    send({ type: 'agent-status', titanOk: false, error: err.message });
  }
}

async function fire(userNumber, label, action) {
  const started = Date.now();
  try {
    await titanApi.fireCue(titan, userNumber, action);
    log('💡', `${label}: playback ${userNumber} ${action === 'release' ? 'released' : 'fired'} (${Date.now() - started} ms)`);
    send({ type: 'fire-result', ok: true, userNumber, label });
  } catch (err) {
    log('🔥', `${label}: playback ${userNumber} FAILED: ${err.message}`);
    send({ type: 'fire-result', ok: false, userNumber, label, error: err.message });
  }
}

function connect() {
  log('🔌', `Connecting to hub ${hubUrl.replace(/key=[^&]+/, 'key=***')}`);
  ws = new WebSocket(hubUrl);

  ws.on('open', () => {
    retryMs = 500;
    log('✅', 'Connected to hub');
    send({ type: 'hello', role: 'agent' });
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }
    if (msg.type === 'agent-config') {
      titan = { ...msg.titan, ...(titanHostOverride ? { host: titanHostOverride } : {}) };
      log('⚙️ ', `Titan Web API at http://${titan.host}:${titan.port}`);
      reportHealth();
    } else if (msg.type === 'fire' && titan) {
      fire(msg.userNumber, msg.label, msg.action === 'release' ? 'release' : 'fire');
    }
  });

  ws.on('close', (code) => {
    if (code === 4001) log('🚫', 'Hub rejected the key - check --key matches "key" in the hub config.json');
    log('⚠️ ', `Hub connection lost, retrying in ${retryMs} ms`);
    setTimeout(connect, retryMs);
    retryMs = Math.min(retryMs * 2, 5000);
  });

  ws.on('error', () => {}); // 'close' follows and handles the retry
}

setInterval(reportHealth, 5000);
connect();
