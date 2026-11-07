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

// URL template for each action. fire/release come from config.json (older
// configs only have those); the rest default to the Titan 12+ script API and
// can be overridden in config.json the same way.
const DEFAULT_URLS = {
  flashUrl: '/titan/script/2/Playbacks/FlashPlayback?handle_userNumber={userNumber}',
  flashOffUrl: '/titan/script/2/Playbacks/ClearFlashPlayback?handle_userNumber={userNumber}',
  swopUrl: '/titan/script/2/Playbacks/SwopPlayback?handle_userNumber={userNumber}',
  swopOffUrl: '/titan/script/2/Playbacks/ClearSwopPlayback?handle_userNumber={userNumber}',
  levelUrl: '/titan/script/2/Playbacks/SetPlaybackLevel?srcHandle_userNumber={userNumber}&level_level={level}',
};
const ACTION_URL = { fire: 'fireUrl', release: 'releaseUrl', flash: 'flashUrl', 'flash-off': 'flashOffUrl', swop: 'swopUrl', 'swop-off': 'swopOffUrl', level: 'levelUrl' };
const TITAN_ACTIONS = Object.keys(ACTION_URL);

// Fire a playback by its Titan user number. action is one of TITAN_ACTIONS
// ("release" kills it); level is 0-100 and only used by "level".
// Retries once on failure, because a missed cue mid-show is worse than a
// slightly late one.
async function fireCue(titan, userNumber, action = 'fire', level = 100) {
  const key = ACTION_URL[action];
  const template = key && (titan[key] ?? DEFAULT_URLS[key]);
  if (!template) throw new Error(`No titan.${key ?? action} in config`);
  const url = buildUrl(titan, template, { userNumber, level: String(Math.max(0, Math.min(100, Number(level) || 0)) / 100) });
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

module.exports = { buildUrl, fireCue, checkHealth, TITAN_ACTIONS, DEFAULT_URLS };
