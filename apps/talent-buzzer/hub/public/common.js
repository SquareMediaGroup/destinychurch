// Shared WebSocket client for the tablet, display and control pages.
// Reconnects forever with a short backoff - a tablet that drops off Wi-Fi
// should come back on its own without anyone touching it.
window.connectHub = function connectHub(hello, onMessage, onStatus) {
  const params = new URLSearchParams(location.search);
  const key = params.get('key');
  const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws${key ? `?key=${encodeURIComponent(key)}` : ''}`;
  let ws;
  let retryMs = 300;

  const api = {
    send(msg) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
        return true;
      }
      return false;
    },
  };

  function open() {
    ws = new WebSocket(url);
    ws.onopen = () => {
      retryMs = 300;
      ws.send(JSON.stringify(hello));
      onStatus(true);
    };
    ws.onmessage = (e) => onMessage(JSON.parse(e.data));
    ws.onclose = (e) => {
      onStatus(false, e.code === 4001 ? 'Wrong access key' : null);
      setTimeout(open, retryMs);
      retryMs = Math.min(retryMs * 2, 2000);
    };
  }
  open();
  return api;
};
