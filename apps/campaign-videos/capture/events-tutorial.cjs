// Films the Event Admin tutorial: everything an Event Admin can do on the real /admin, against the
// pretend site in capture/events-seed.cjs. How to run it: the top of capture/tutorial-kit.cjs.
//
// Two things are answered in the browser rather than by a service, because the filming copy has no
// keys for them: Spotify (Song Requests shows a connected church account) and DestinyAI (not filmed
// past its opening screen; it needs the AI Gateway).
const path = require('path');
const { film, PHOTOS } = require('./tutorial-kit.cjs');

film({ id: 'events', roles: 'event_admin' }, async (t) => {
  const { page, ctx, part, step, look, go, settle, btn, link, sidebar, main } = t;
  /** The nearest block around `text` that holds a button: its controls. */
  const around = (text) => page.locator(`xpath=//*[normalize-space(text())=${JSON.stringify(text)}]/ancestor::*[.//button][1]`).first();
  const fieldUnder = (label) => page.locator(`xpath=//label[starts-with(normalize-space(.), ${JSON.stringify(label)})]/following::*[self::input or self::textarea or self::select][1]`).first();

  // Spotify: the church account, connected, playing on the hall speaker. Settings still save for real.
  await ctx.route('**/api/admin/song-requests', async (r) => {
    if (r.request().method() !== 'GET') return r.continue();
    const res = await r.fetch();
    const data = await res.json();
    await r.fulfill({ json: { ...data, configured: true, connection: { accountName: 'Destiny Church', connectedAt: '2026-10-01T10:00:00Z' }, device: 'Hall speaker' } });
  });

  // ── Finding your way ─────────────────────────────────────────────────────
  await part('Finding your way', async () => {
    await go('/admin');
    await look('Signed in as an Event Admin, the dashboard shows your courses and announcements at a glance.', null, { hold: 3.2 });
    await look('Your sections are in the sidebar: Announcements for events and the site’s pop-ups, and Courses.', sidebar(), { zoom: 1.3, hold: 3.4 });
    await step('Open Courses to see each course’s page.', sidebar().getByText('Courses', { exact: true }).first(), (l) => l.click(), { zoom: 1.6 });
  });

  // ── Courses ──────────────────────────────────────────────────────────────
  await part('Courses', async () => {
    await go('/admin');
    if (!(await sidebar().getByRole('link', { name: 'Alpha', exact: true }).isVisible())) {
      await sidebar().getByText('Courses', { exact: true }).first().click();
      await settle(400);
    }
    await step('Each course has its own page. Start with Alpha.', sidebar().getByRole('link', { name: 'Alpha', exact: true }), (l) => l.click(), { zoom: 1.6 });
    await look('Promote courses: each switch shows that course’s banner across the top of the website.', main().getByText('Promote courses'), { zoom: 1.4, hold: 3.2 });
    await step('Turn Youth Alpha’s banner on. Both can run at once; they stack.', around('Youth Alpha').locator('button').last(), (l) => l.click(), { zoom: 1.6 });
    await look('To add a date, fill in Add event. The quickest way is to copy it from ChurchSuite.', main().getByText('Add event', { exact: false }).first(), { zoom: 1.3 });
    await step('Fill from ChurchSuite event lists what’s coming up in ChurchSuite…', btn(/Fill from ChurchSuite event/), (l) => l.click(), { zoom: 1.4, hold: 2.6 });
    await step('…pick one, and its date and sign-up link are filled in for you.', page.getByRole('button', { name: /Alpha at Destiny/ }).first(), (l) => l.click(), { zoom: 1.3, hold: 2.8 });
    await step('Or type them in. Choose which course it’s for…', fieldUnder('Type'), (l) => l.selectOption('youth_alpha'), { zoom: 1.6 });
    await step('…the first date…', fieldUnder('Start Date'), (l) => l.fill('2027-01-20'), { zoom: 1.7 });
    await step('…how often it meets…', fieldUnder('Frequency'), (l) => l.selectOption({ index: 0 }), { zoom: 1.7 });
    const signup = page.getByPlaceholder('https://destinytees.churchsuite.com/forms/...');
    await step('…and the ChurchSuite sign-up link.', signup, null, { zoom: 1.6, typing: { text: 'https://destinytees.churchsuite.com/forms/youth-alpha-jan' } });
    await step('In-person or Online. Online asks for the Zoom or Meet details instead of a place.', btn('Online', true), (l) => l.click(), { zoom: 1.6, hold: 2.8 });
    await step('Back to In-person, and say where.', btn('In-person', true), async () => {
      await btn('In-person', true).click();
      await page.getByPlaceholder('e.g. Main Campus').fill('Youth Hall');
    }, { zoom: 1.6 });
    await step('Create event adds it to the list, and to the course page on the website.', btn('Create event', true), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
    await look('Dates are listed by course, soonest first.', main().getByText(/Youth Alpha Events/), { zoom: 1.4, hold: 3 });
    const row = main().locator('div').filter({ hasText: /^20 Jan 2027/ }).first();
    await step('The switch hides a date without deleting it.', around('20 Jan 2027').locator('button').first(), (l) => l.click(), { zoom: 1.8 });
    await step('The bin deletes it.', around('20 Jan 2027').locator('button').last(), async (l) => {
      await l.click();
      await page.waitForTimeout(500);
    }, { zoom: 1.6, hold: 2.6 });
    const dialog = page.getByRole('dialog');
    if (await dialog.count()) await step('It asks first. Here we’ll keep it.', dialog.getByRole('button', { name: 'Cancel' }), (l) => l.click(), { zoom: 1.4, hold: 1.8 });
    void row;
    await step('The other courses work the same way: Destiny 12:2, the Bible Course and CAP Money.', sidebar().getByRole('link', { name: 'Destiny 12:2', exact: true }), (l) => l.click(), { zoom: 1.4, hold: 2.8 });
    await step('Featured Course picks which course headlines the What’s On page.', sidebar().getByRole('link', { name: 'Featured Course', exact: true }), (l) => l.click(), { hold: 2.4 });
    await step('Choose one…', btn(/^The Bible Course/), (l) => l.click(), { zoom: 1.4 });
    await step('…and Save changes.', btn('Save changes', true), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
  });

  // ── The site popup ───────────────────────────────────────────────────────
  await part('The site popup', async () => {
    await go('/admin');
    if (!(await sidebar().getByRole('link', { name: 'Popup', exact: true }).isVisible())) {
      await sidebar().getByText('Announcements', { exact: true }).first().click();
      await settle(400);
    }
    await step('Popup is the box that greets first-time visitors to the website.', sidebar().getByRole('link', { name: 'Popup', exact: true }), (l) => l.click(), { zoom: 1.5 });
    await step('Turn on Show popup.', around('Show popup').locator('button').first(), (l) => l.click(), { zoom: 1.6 });
    await look('Show once per session means people see it once, not on every page.', main().getByText('Show once per session'), { zoom: 1.6 });
    await step('Set times to run it for a while: it appears and disappears on its own.', fieldUnder('Show from'), async () => {
      await fieldUnder('Show from').fill('2026-11-08T08:00');
      await fieldUnder('Hide after').fill('2026-11-15T20:00');
    }, { zoom: 1.5, hold: 2.6 });
    await step('Add an image…', main().getByText('Click to upload').first(), async () => {
      await main().locator('input[type="file"]').first().setInputFiles(path.join(PHOTOS, 'hero-overflow.webp'));
      await page.waitForTimeout(2500);
    }, { zoom: 1.3, hold: 2.4 });
    await step('…a title…', page.getByPlaceholder('Welcome to Destiny Church'), null, { zoom: 1.6, typing: { text: 'Christmas at Destiny' } });
    await step('…a short message…', main().locator('textarea').first(), null, { zoom: 1.5, typing: { text: 'Carols, candles and a warm welcome. Sunday 20 December, 10:30am and 6pm.' } });
    await step('…and a button with where it goes.', page.getByPlaceholder('Find out more'), async () => {
      await page.getByPlaceholder('/visit').fill('/whats-on');
    }, { zoom: 1.5, typing: { text: 'See the times' } });
    await step('Save changes, and it’s live.', btn('Save changes', true), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
  });

  // ── Featured event and its popup ─────────────────────────────────────────
  await part('Featured event', async () => {
    await step('Featured Event promotes one ChurchSuite event: a wide banner on What’s On and the first card on the homepage.', sidebar().getByRole('link', { name: 'Featured Event', exact: true }), (l) => l.click(), { hold: 3.4 });
    await step('Find the event…', page.getByPlaceholder('Filter events'), null, { zoom: 1.5, typing: { text: 'Andrews' } });
    await step('…and pick it. Its name, picture and dates come from ChurchSuite.', main().getByRole('button', { name: /A Day with Dr John Andrews/ }).first(), (l) => l.click(), { zoom: 1.3, hold: 2.6 });
    await step('Tick Promote this event. It stops by itself once the event has finished.', page.getByLabel(/Promote this event/), (l) => l.check(), { zoom: 1.6, hold: 2.6 });
    await look('Leave the rest blank to use ChurchSuite’s own wording, or write your own headline, blurb, picture and button.', main().getByText('Headline', { exact: true }).first(), { zoom: 1.4, hold: 3.6 });
    await step('Save.', main().getByRole('button', { name: 'Save', exact: true }), (l) => l.click(), { zoom: 1.6, hold: 2.2 });
    await step('Event Popup is a pop-up that advertises the featured event.', sidebar().getByRole('link', { name: 'Event Popup', exact: true }), (l) => l.click(), { hold: 2.4 });
    await step('Turn it on. It shows once per visit.', page.getByLabel(/Show the popup/), (l) => l.check(), { zoom: 1.6 });
    await look('Blank fields fall back to the featured event’s own headline, blurb and link.', main().getByText('Title', { exact: true }).first(), { zoom: 1.4, hold: 3.2 });
    await step('Save.', main().getByRole('button', { name: 'Save', exact: true }), (l) => l.click(), { zoom: 1.6, hold: 2.2 });
  });

  // ── The NFC page ─────────────────────────────────────────────────────────
  await part('The NFC page', async () => {
    await step('NFC Page is what people see when they tap their phone on the tag on the seat in front.', sidebar().getByRole('link', { name: 'NFC Page', exact: true }), (l) => l.click(), { hold: 3 });
    await look('Connect Card and Giving are always there. Everything below is yours to change.', main().getByText('Always shown'), { zoom: 1.4, hold: 3 });
    await step('New tile adds one.', btn(/New tile/), (l) => l.click(), { zoom: 1.6 });
    await look('Choose what tapping it does: sign up for an event, open a form, or show details with a button.', main().getByText('What happens when someone taps it'), { zoom: 1.3, hold: 3.6 });
    await step('This one shows details.', btn(/^Shows details/), (l) => l.click(), { zoom: 1.5 });
    await step('Give it a title…', page.getByPlaceholder('Alpha').first(), null, { zoom: 1.6, typing: { text: 'Kids church' } });
    await step('…a line underneath…', page.getByPlaceholder('Explore life, faith and meaning'), null, { zoom: 1.6, typing: { text: 'Ages 0 to 11, every Sunday' } });
    await step('…an icon…', main().getByRole('button', { name: 'child_care', exact: true }), (l) => l.click(), { zoom: 1.8 });
    await step('…the details…', main().locator('textarea').first(), null, { zoom: 1.5, typing: { text: 'Check your children in at the welcome desk from 10:15am. Every leader is DBS checked.' } });
    await step('…and a button.', page.getByPlaceholder('Find out more'), async () => {
      await page.getByPlaceholder('/alpha').fill('/kids');
    }, { zoom: 1.5, typing: { text: 'Meet the team' } });
    await step('Add tile.', btn('Add tile', true), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await step('Arrows change the order people see.', main().getByRole('button', { name: 'Move up' }).last(), (l) => l.click(), { zoom: 1.6 });
    await step('The switch hides a tile for now…', main().getByRole('button', { name: /Hide tile/ }).first(), (l) => l.click(), { zoom: 1.6 });
    await look('…the pencil edits it, and the bin deletes it.', main().getByRole('button', { name: 'Edit' }).first(), { zoom: 1.7, hold: 2.8 });
  });

  // ── Links pages ──────────────────────────────────────────────────────────
  await part('Links pages', async () => {
    await step('Links Pages are mini sites for Instagram bios, QR codes and NFC tags, at destinytees.uk/links.', sidebar().getByRole('link', { name: 'Links Pages', exact: true }), (l) => l.click(), { hold: 3.2 });
    await look('Each shows how many views and clicks it’s had.', main().getByText('views').first(), { zoom: 1.7 });
    await step('New page.', btn('New page', true), (l) => l.click(), { zoom: 1.6 });
    await step('Name it. The address is made for you.', page.getByPlaceholder('e.g. Destiny Youth'), null, { zoom: 1.5, typing: { text: 'Destiny Youth' } });
    await look('Start from a theme or a ready-made page. New pages start as drafts.', page.locator('select').last(), { zoom: 1.5, hold: 3 });
    await step('Create page.', btn('Create page', true), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
    await look('The editor: your blocks on the left, a live preview of the phone on the right.', null, { hold: 3.4 });
    await step('Add a block.', main().getByText('Add a block').first(), (l) => l.click(), { zoom: 1.4 });
    await look('Links, headings, text, images, dividers, ChurchSuite events, videos and maps, and forms.', page.getByText('A button to any page or site.'), { zoom: 1.1, hold: 3.6 });
    await step('A link…', page.getByText('A button to any page or site.'), (l) => l.click(), { zoom: 1.4, hold: 2.4 });
    const ed = main();
    await step('…with its button text…', ed.locator('input').first(), null, { zoom: 1.6, typing: { text: 'Youth night, Fridays 7pm' } });
    await step('…and where it goes.', ed.locator('input[placeholder*="https"], input[placeholder*="/"]').first(), null, { zoom: 1.6, typing: { text: '/youth' } });
    await step('Add an event block: it shows ChurchSuite events and keeps itself up to date.', ed.getByText('Add a block').first(), async (l) => {
      await l.click();
      await page.waitForTimeout(500);
      await page.getByText('A ChurchSuite event, or the next few.').click();
    }, { zoom: 1.3, hold: 3 });
    await step('Appearance: colours, fonts and the button style, with the preview changing as you go.', ed.getByText('Appearance', { exact: true }).first(), (l) => l.click(), { zoom: 1.2, hold: 3.4 });
    await step('Profile: the picture, name, short bio and social links at the top.', ed.getByText('Profile', { exact: true }).first(), (l) => l.click(), { zoom: 1.2, hold: 3 });
    await step('Settings: the address, the title Google shows, and Published.', ed.getByText('Settings', { exact: true }).first(), (l) => l.click(), { zoom: 1.2, hold: 3 });
    await step('Save.', main().getByRole('button', { name: 'Save', exact: true }).first(), (l) => l.click(), { zoom: 1.6, hold: 2.2 });
    await go('/admin/links');
    await step('Back on the list, open the Sunday page.', main().getByRole('link', { name: /Destiny Church/ }).first(), (l) => l.click(), { zoom: 1.4 });
    await step('Responses holds whatever people send through its forms.', main().getByText('Responses', { exact: true }).first(), (l) => l.click(), { zoom: 1.3, hold: 3.2 });
    await step('Stats shows views and the most-clicked links.', main().getByText('Stats', { exact: true }).first(), (l) => l.click(), { zoom: 1.3, hold: 3 });
  });

  // ── Song requests ────────────────────────────────────────────────────────
  await part('Song requests', async () => {
    await step('Song Requests lets people at an event ask for songs, straight into the church Spotify queue.', sidebar().getByRole('link', { name: 'Song Requests', exact: true }), (l) => l.click(), { hold: 3.2 });
    await look('It plays through the church’s Spotify account on the hall speaker. Connect Spotify signs in to it.', main().getByText('Hall speaker'), { zoom: 1.5, hold: 3.6 });
    await step('Name the night…', page.getByLabel('Event name'), null, { zoom: 1.5, typing: { text: 'Youth Christmas party' } });
    await step('…set how many songs can wait at once, and how many each person can ask for, and Save settings.', btn('Save settings', true), (l) => l.click(), { zoom: 1.5, hold: 3 });
    await step('Open requests when the night starts. Explicit songs are always blocked.', btn('Open requests', true), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
    await step('Remove takes a song off the list. If Spotify already has it queued, skip it on the device.', main().getByRole('button', { name: 'Remove' }).first(), (l) => l.click(), { zoom: 1.6, hold: 3.2 });
  });

  // ── Talent show ──────────────────────────────────────────────────────────
  await part('Talent show voting', async () => {
    await step('Talent Show Voting: the audience scans a QR code and votes for their favourite act.', sidebar().getByRole('link', { name: 'Talent Show Voting', exact: true }), (l) => l.click(), { hold: 3 });
    const act = page.getByPlaceholder('The Harmony Sisters');
    await step('Add each act: its name…', act, null, { zoom: 1.6, typing: { text: 'Youth Choir' } });
    await step('…who’s in it, and what they’re doing.', page.getByPlaceholder('Grace and Ruth Okafor'), async () => {
      await page.getByPlaceholder('Singing “Oceans”').fill('Singing “O Holy Night”');
    }, { zoom: 1.5, typing: { text: 'Destiny Youth' } });
    await step('Add act.', btn('Add act', true), (l) => l.click(), { zoom: 1.6, hold: 2.2 });
    await look('Acts are in running order. Arrows move them, the eye hides one, the pencil edits, the bin deletes.', main().getByRole('button', { name: /Move The Okafor Sisters down/ }), { zoom: 1.6, hold: 3.6 });
    await step('Open voting when the first act starts.', btn('Open voting', true), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await look('Put the QR code on a slide, or print it. One vote per phone, which they can change until voting closes.', btn(/Download QR code/), { zoom: 1.4, hold: 3.6 });
    await step('The judges’ X’s: press plus after each act. Each X counts as two votes.', main().getByRole('button', { name: /One more judges' X for The Okafor Sisters/ }), (l) => l.click(), { zoom: 1.8, hold: 2.8 });
    await step('Open results screen goes on the projector. It shows the vote count while voting is open.', main().getByRole('link', { name: /Open results screen/ }), async (l) => {
      const href = await l.getAttribute('href');
      await go(href);
    }, { zoom: 1.5, hold: 1.4 });
    await look('The results screen, ready for the big reveal.', null, { hold: 3 });
    await go('/admin/talent-show');
    await step('Reveal results when you’re ready. The screen shows the winner.', btn('Reveal results', true), (l) => l.click(), { zoom: 1.6, hold: 2.8 });
    await step('Clear votes and start again resets it all, ready for another round.', btn('Clear votes and start again', true), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
    const dialog = page.getByRole('dialog');
    if (await dialog.count()) await step('It asks first. Here we’ll keep tonight’s votes.', dialog.getByRole('button', { name: 'Cancel' }), (l) => l.click(), { zoom: 1.4, hold: 1.8 });
  });

  // ── DestinyAI ────────────────────────────────────────────────────────────
  await part('DestinyAI', async () => {
    await step('DestinyAI does admin jobs for you in plain English.', sidebar().getByRole('link', { name: 'DestinyAI', exact: true }), (l) => l.click(), { hold: 2.8 });
    await look('Ask for something like a banner for tomorrow, or to feature the next event. It suggests a plan, and nothing changes until you confirm it.', main().getByPlaceholder('Ask DestinyAI to do something'), { zoom: 1.3, hold: 4.6 });
  });
});
