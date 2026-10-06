// Avolites Titan Web API client. Used by the agent (on the Titan PC, host
// "localhost") and by the hub in "direct" mode (host = the Titan PC's IP).
//
// The Web API is built into Titan (v12+) and listens on port 4430. URL paths are
// templates in config.json so they can be adjusted without code changes if a
// Titan version names things differently.

function buildUrl(titan, path, vars = {}) {
  const filled = path.replace(/\{(\w+)\}/g, (_, k) => encodeURIComponent(vars[k] ?? ''));
  return `http://${titan.host}:${titan.port}${filled}`;
}

async function request(titan, url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(titan.timeoutMs ?? 1500) });
  const body = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
  return body;
}

// Fire (or, with action "release", kill) a playback by its Titan user number.
// Retries once on failure, because a missed cue mid-show is worse than a
// slightly late one.
async function fireCue(titan, userNumber, action = 'fire') {
  const template = action === 'release' ? titan.releaseUrl : titan.fireUrl;
  if (!template) throw new Error(`No titan.${action}Url in config`);
  const url = buildUrl(titan, template, { userNumber });
  try {
    await request(titan, url);
  } catch (err) {
    await request(titan, url).catch((err2) => {
      throw new Error(`${err2.message} (first attempt: ${err.message})`);
    });
  }
  return url;
}

// Returns the Titan software version string, or throws if Titan isn't reachable.
async function checkHealth(titan) {
  const body = await request(titan, buildUrl(titan, titan.healthUrl));
  return body.replace(/^"|"$/g, '').trim();
}

module.exports = { buildUrl, fireCue, checkHealth };
