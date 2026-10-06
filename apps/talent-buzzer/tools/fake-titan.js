#!/usr/bin/env node
// Stand-in for the Titan Web API, for rehearsing without the lighting console.
// Logs every playback it is asked to fire.
//
//   node tools/fake-titan.js [port]     (default 4430)

const http = require('node:http');

const port = Number(process.argv[2] ?? 4430);

http
  .createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const t = new Date().toLocaleTimeString('en-GB', { hour12: false });
    if (url.pathname.endsWith('/System/SoftwareVersion')) {
      res.end('"Fake Titan 1.0"');
      return;
    }
    if (url.pathname.includes('/Playbacks/')) {
      console.log(`[${t}] 💡 ${url.pathname.split('/').pop()} playback ${url.searchParams.get('handle_userNumber')}`);
      res.end('');
      return;
    }
    res.writeHead(404).end();
  })
  .listen(port, () => console.log(`🎛️  Fake Titan Web API listening on http://localhost:${port}`));
