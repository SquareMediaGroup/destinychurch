# Talent Show Buzzers

Judge buzzers for the Destiny talent show. Five Android tablets act as buzzers:
four red **X** buzzers and one dedicated **golden buzzer**. A press:

- fires a lighting cue on the Avolites (Titan Web API),
- pops a big 3D red X out of the LED screen above that judge's name (or the gold takeover for the golden buzzer),
- plays the buzzer sound (or golden fanfare) from the LED screen machine.

Everything runs on the venue network. No internet, accounts or cloud services
are involved, so it keeps working if the building connection drops.

```
 4 red tablets ─┐                      ┌─> /display  (fullscreen on the LED output: X's, gold, sound)
 1 gold tablet ─┼─ Wi-Fi/LAN ─> HUB ───┼─> /control  (operator: reset, lock, test, status)
                │  (LED machine)       └─> Avolites agent ──> Titan Web API (localhost:4430)
```

The **same app** goes on both machines. When it starts, a setup page asks which machine it is
and runs the right part:

| Piece | Runs on | What it does |
| --- | --- | --- |
| Hub (`hub/server.js`) | LED screen machine | Serves all the pages, holds the show state, relays presses |
| Display page (`/display`) | LED screen machine, fullscreen on the LED output | Shows the X's / golden takeover and plays the sounds |
| Control page (`/control`) | Any laptop/phone (operator) | Reset, lock, test cues and sounds, see what is connected |
| Avolites agent (`agent/avolites-agent.js`) | Titan PC | Receives cues from the hub, fires them on Titan |
| Tablet page (`/tablet?seat=1`) | Each Android tablet | The buzzer |

## Rules during the show

- Each judge's X **stays on** until the operator presses **Reset buzzers**. Pressing again does nothing.
- When **all four judges** have buzzed, the screen strobes red with an alarm sound, then keeps pulsing red until reset (and fires the optional `allX` lighting cue).
- The golden buzzer fires **once** until reset.
- **Lock buzzers** ignores every press (use it between acts so nobody fires a cue by accident).
- Reset clears the screen and, with `releaseOnReset`, kills the X and golden playbacks on Titan.
- If a tablet dies, the **Trigger** button next to it on the control page fires that buzzer exactly as if it was pressed.

## Setup

### 1. Install on both machines (LED screen machine and Avolites PC)

1. Install [Node.js](https://nodejs.org) 20 or newer (LTS installer, default options).
2. Copy this `talent-buzzer` folder onto the machine.
3. Double-click `start.bat` (or run `npm install` then `npm start`). The first run installs
   what it needs, then opens the **setup page** (`http://localhost:8090`) in the browser.
4. Pick **LED screen machine** or **Avolites machine** and press **Start**. The choice is remembered
   in `machine.json`, so next time `start.bat` goes straight into that role. Use **Change** on the
   setup page to switch.
5. Allow Node through Windows Firewall when asked (**Private networks**). On the LED machine this
   lets the tablets connect; on the Avolites PC it lets the app hear the LED machine announcing itself.

Leave the `start.bat` window open during the show. If the app crashes, it restarts itself.

### 2. LED screen machine

1. Copy `config.example.json` to `config.json` and edit it (judge names, cue numbers, see [Config](#config)).
   Restart `start.bat` after editing.
2. The setup page lists the **device links** (Control, Display and one per tablet) with this machine's IP address.
3. Open the **Display** link in Chrome or Edge, drag it onto the LED output, **click once**
   (this unlocks sound, because browsers block audio until a click), then press **F11** for fullscreen.

Using the display as a source in Resolume / ProPresenter / OBS instead? Point a browser
source at the display link. Options you can add to the URL:

| Option | Effect |
| --- | --- |
| `bg=transparent` | Transparent background for keying over video |
| `ghost=0` | Hide the faint empty X outlines |
| `labels=0` | Hide the judge names under each X |
| `audio=off` | No sound from this copy of the page (e.g. a second display) |

### Avolites PC

1. First check Titan's web control: on the Titan PC, open
   `http://localhost:4430/titan/get/System/SoftwareVersion` in a browser. You should see the Titan version.
2. Pick **Avolites machine** on the setup page. Leave the address blank: it finds the LED screen
   machine on the network by itself (both must be on the same network). If it can't, type the LED
   machine's IP address (shown on that machine's setup page).
3. The setup page should show **LED screen machine: Found**, **Connection: Connected** and
   **Avolites Titan: OK**. The control page shows the same.

All the show settings (cue numbers, names) live in `config.json` on the LED machine. The Avolites
PC needs no config.

**Hardware console (Arena, Quartz, Tiger Touch, Diamond) or can't install software on the
lighting PC?** Only install on the LED machine, and set `"lighting": { "mode": "direct" }` and
`"titan": { "host": "<console IP>" }` in its `config.json`. The LED machine then calls the
Titan Web API over the network itself. Check `http://<console IP>:4430/titan/get/System/SoftwareVersion`
from the LED machine first.

### 3. Lighting cues on Titan

How a press reaches the lights:

1. A judge presses their tablet. The tablet tells the hub on the LED machine over Wi-Fi.
2. The hub looks up that buzzer's playback number in `config.json` (e.g. judge 1 = 101) and sends
   "fire playback 101" to the agent on the Titan PC.
3. The agent calls Titan's built-in Web API on that same PC:
   `http://localhost:4430/titan/script/2/Playbacks/FirePlaybackAtLevel?handle_userNumber=101&level_level=1`.
4. Titan fires playback 101 at full, exactly as if someone had pushed its button. It shows on the
   console like any other playback, and the operator can still override it by hand.
5. On **Reset**, the hub sends "kill playback" for each buzzer cue (`KillPlayback`), so the looks drop out.

What the lighting operator does:

- Record one playback per look and give each a **user number**:
  - one X look per judge (or the same number for all four, if you want one look),
  - an "all four out" look (e.g. red strobe), optional,
  - a golden buzzer look,
  - optionally a reset look (e.g. back to the stage state).
- Put those numbers in `config.json` -> `cues` (`x`, `allX`, `golden`, `reset`).
- If you'd rather the looks time out by themselves, build them that way in Titan and set
  `releaseOnReset` to `false`.
- Use the **Test lighting cues** buttons on the control page to fire each playback on its own.

### 4. Tablets

On each tablet:

1. Join the same Wi-Fi network as the LED machine.
2. Open Chrome and go to the tablet link from the hub window, e.g.
   `http://192.168.1.50:8080/tablet?seat=1` (seats `1`–`4`, golden is `seat=gold`).
   Or open `http://192.168.1.50:8080/tablet` and pick the seat from the list.
3. Chrome menu → **Add to Home screen**, then open it from the home screen (full screen, no address bar).
4. Keep the screen on: Settings → Display → Screen timeout → longest, or Developer options →
   **Stay awake** while charging. (The page asks for a wake lock too, but browsers only
   allow that over HTTPS.)
5. Optional: Settings → Security → **App pinning** so judges can't leave the page.
6. Turn the volume / vibration on if you want the buzz feel on the tablet.

The status under the button reads **Ready**, **Buzzed - waiting for reset**, **Locked**,
or **Not connected - reconnecting...**. Tablets reconnect on their own.

### Sounds

Without sound files the display page synthesises a game-show buzzer and a golden fanfare.
To use your own, drop `buzzer.mp3`, `all-out.mp3` and `golden.mp3` into `hub/public/sounds/` and refresh the
display page. Use **Test X** / **Test all out** / **Test gold** on the control page to check levels.

## Config

`config.json` (copy from `config.example.json`):

| Key | Meaning |
| --- | --- |
| `hubPort` | Port the hub listens on (default 8080) |
| `key` | Optional access key. If set, every link needs `?key=...` (the hub prints the right links). Set this if the tablets are on a Wi-Fi the audience can join. |
| `debounceMs` | Ignore a second press on the same buzzer within this many ms |
| `judges` | Seats and names shown on the tablets, control page and display labels |
| `golden.name` | Name for the golden tablet |
| `cues.x` | Titan playback user number per seat |
| `cues.allX` | Playback fired when all four judges have buzzed, or `null` |
| `cues.golden` | Golden buzzer playback |
| `cues.reset` | Playback fired on Reset, or `null` |
| `cues.releaseOnReset` | Kill X / all-X / golden playbacks on Reset |
| `lighting.mode` | `agent` (default), `direct` (hub calls Titan itself), or `off` |
| `titan.*` | Titan Web API host/port/timeout and URL templates (`{userNumber}` is filled in) |

## Rehearsing without the console

```bash
npm install
npm run fake-titan          # pretends to be Titan on port 4430, logs every playback
npm run hub                 # the LED screen machine part
npm run agent               # the Avolites part (finds the hub by itself)
```

Or run the full app twice on one computer, each with its own setup page:
`node app.js --dir=./a` and `node app.js --dir=./b --setup-port=8091`.

Open `/control`, `/display` and a few `/tablet?seat=N` tabs in a browser and press away.
`npm test` runs the show-logic unit tests.

## Show-day checklist (5 minutes)

1. `start.bat` running on the LED machine; display page open, clicked once, fullscreen.
2. `start.bat` running on the Titan PC (or `direct` mode). The control page shows Titan **OK**.
3. All five tablets show a green dot on the control page (amber means two devices claim one seat).
4. Control page → **Test X** and **Test gold**: sound comes out of the PA.
5. Control page → each **Test lighting cue** button: the right look fires.
6. Press each tablet once, check the screen + lights, then **Reset buzzers**.
7. **Lock buzzers** until the first act starts.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Tablet says "Not connected" | Same Wi-Fi as the LED machine? Windows Firewall allowing Node on Private networks? Correct IP? |
| No sound | Control page shows "Click the display page once" → click it. Check Windows output device. |
| Lights don't fire | Lighting log on the control page shows the error. "Agent not connected" → start `start.bat` on the Titan PC and check its setup page. "Not reachable" → Titan not running, or the Web API URL is wrong for your Titan version (`titan.*` in config). |
| Avolites setup page stuck on "Looking on the network..." | Both machines on the same network? Allow Node through Windows Firewall (Private) on the Titan PC, or type the LED machine's IP on the setup page. |
| Wrong look fires | Playback user numbers in `cues` don't match Titan. |
| "Wrong access key" | The link is missing `?key=...`, or it doesn't match `key` in config. |
