// What Destiny One says when its backend (Supabase) is down. The server sends
// it as the `outage` error code (lib/destinyOne/http.ts), and the app uses the
// same words when it can tell Supabase itself is unreachable (sign-in).

export const D1_STATUS_URL = "https://status.destinytees.uk";

export const OUTAGE_MESSAGE = "Destiny One is having an outage right now. Check status.destinytees.uk for updates.";
