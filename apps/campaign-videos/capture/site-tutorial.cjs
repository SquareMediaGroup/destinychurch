// Films the Site Admin tutorial: posts and pages, redirects, the status page and analytics, on the
// real /admin, against the pretend site in capture/site-seed.cjs. How to run it: the top of
// capture/tutorial-kit.cjs. The AI title and summary suggestions in the post editor need an OpenAI
// key, so they're mentioned, not pressed.
const { film } = require('./tutorial-kit.cjs');

film({ id: 'site', roles: 'site_admin' }, async (t) => {
  const { page, part, step, look, go, settle, btn, sidebar, main } = t;
  /** A link inside the sidebar's Site group, opening the group first if it's closed. */
  const siteLink = async (name) => {
    const l = sidebar().getByRole('link', { name }).first();
    if (!(await l.isVisible())) {
      await sidebar().getByText('Site', { exact: true }).first().click();
      await settle(400);
    }
    return l;
  };

  await part('Finding your way', async () => {
    await go('/admin');
    await look('Signed in as a Site Admin, the dashboard shows your pages and redirects, and any drafts waiting.', null, { hold: 3.2 });
    await look('Posts is your own section. Redirects, the status page and analytics are under Site.', sidebar(), { zoom: 1.3, hold: 3.2 });
  });

  await part('Posts and pages', async () => {
    await step('Posts are the website’s standalone pages: campaigns, one-off events, anything temporary.', sidebar().getByRole('link', { name: /Posts/ }).first(), (l) => l.click(), { hold: 3.2 });
    await look('Each shows its address, whether it’s live, its visits in the last 30 days and when it was last edited.', main().locator('table tbody tr, ul li').first(), { zoom: 1.3, hold: 3.4 });
    await step('Filter by status: live, scheduled, ended or draft…', btn(/^Draft/), (l) => l.click(), { zoom: 1.5 });
    await step('…or by tag.', btn(/^christmas/), async (l) => { await btn(/^All/).click(); await settle(300); await l.click(); }, { zoom: 1.5 });
    // Back to every tag: the second All (the first is for status).
    await page.getByRole('button', { name: /^All/ }).locator('visible=true').nth(1).click();
    await settle(400);
    await step('Or search by title or address.', page.getByPlaceholder('Search by title or URL'), null, { zoom: 1.5, typing: { text: 'baptism' } });
    await page.getByPlaceholder('Search by title or URL').fill('');
    await settle(300);
  });

  await part('Write a page', async () => {
    if (!page.url().includes('/admin/posts')) await go('/admin/posts');
    await step('New post starts a page.', btn(/New post/), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
    await look('Pick a starting point: a blank page, or a ready-made layout for an event, a campaign, a landing page or an FAQ.', page.getByText('Pick a starting point.', { exact: false }), { zoom: 1.3, hold: 3.6 });
    await step('An event page comes with a photo header, key details, an FAQ and a sign-up button.', page.getByText('Photo header, key details', { exact: false }), (l) => l.click(), { zoom: 1.4, hold: 2.6 });
    await look('Blocks on the left, the page in the middle, its settings on the right.', null, { hold: 3.2 });
    await step('Give it a title…', page.getByPlaceholder('Page title'), null, { zoom: 1.5, typing: { text: 'Carol singing in the town centre' } });
    const intro = page.locator('[contenteditable=true]').getByText('Tell people what', { exact: false }).first();
    await step('…and write over the layout’s placeholder text. The toolbar does headings, bold, lists, links and pictures.', intro, null, { zoom: 1.3, typing: { text: 'Join us on Saturday 19 December at 2pm by the Christmas tree on the high street. Bring a scarf, we’ll bring the hot chocolate.', fill: false, select: true } });
    await step('Blocks add the rest: FAQs, callouts, card grids, videos, photo galleries and buttons. Click one to drop it in where you are.', page.getByText('Callout', { exact: true }).first(), (l) => l.click(), { zoom: 1.3, hold: 3.4 });
    await look('The Block tab on the right edits whichever block you’re in.', page.getByText('Block', { exact: true }).first(), { zoom: 1.5, hold: 2.8 });
    await step('Page: the address…', page.getByText('Page', { exact: true }).first(), (l) => l.click(), { zoom: 1.4 });
    await step('…set it to something short.', page.getByPlaceholder('easter-2026'), null, { zoom: 1.5, typing: { text: 'carols' } });
    await look('Schedule sets when it goes live and comes down, all on its own.', page.getByText('Go live', { exact: true }).first(), { zoom: 1.5, hold: 3 });
    await look('Page header picks the style at the top: plain, with an image, or a coloured banner.', page.getByText('Page header', { exact: false }).first(), { zoom: 1.4, hold: 3 });
    await step('Save draft keeps your work without putting it live.', btn('Save draft', true), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
    await look('If something’s missing it tells you. This layout’s image header needs a picture: add one under Header image, or pick another header.', page.getByText(/needs an image/).first(), { zoom: 1.6, hold: 3.8 });
    await step('We’ll keep it plain…', page.getByText('Plain', { exact: true }).first(), (l) => l.click(), { zoom: 1.6 });
    await step('…and Save draft again.', btn('Save draft', true), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
    await step('Preview shows it on a phone, a tablet or a computer before anyone else sees it.', btn('Preview', true), (l) => l.click(), { zoom: 1.2, hold: 3.2, wait: 4000 });
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Preview' }).waitFor({ state: 'hidden', timeout: 5000 }).catch((e) => console.log('preview still open', e.message.slice(0, 60)));
    await settle(800);
    await step('Publish when it’s ready.', page.locator('button:visible', { hasText: /^Publish/ }).first(), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
    await step('It checks first, and lists anything that would make the page look unfinished. Cancel to fix them, or Publish anyway.', btn('Publish anyway', true), (l) => l.click(), { zoom: 1.4, hold: 3.6 });
  });

  await part('Editing and history', async () => {
    await go('/admin/posts');
    await step('Open a live page to change it.', main().getByRole('button', { name: 'Edit Christmas at Destiny' }), (l) => l.click(), { zoom: 1.4, hold: 2.4 });
    await look('Changes to a live page stay a draft until you press Publish changes, so you can take your time.', btn(/Publish changes/), { zoom: 1.5, hold: 3.4 });
    await look('Before you publish lists anything missing, like a picture for when it’s shared.', page.getByText('Before you publish'), { zoom: 1.5, hold: 3.2 });
    await step('Check links tests every link on the page.', btn('Check links', true), (l) => l.click(), { zoom: 1.5, hold: 2.8 });
    await step('History has every saved version. Open one to see it, or put it back.', page.getByText('History', { exact: true }).first(), (l) => l.click(), { zoom: 1.4, hold: 3.2 });
    await page.keyboard.press('Escape');
    await go('/admin/posts');
    await step('Duplicate copies a page, ready to change: handy for this year’s version of last year’s.', main().getByRole('button', { name: 'Duplicate Summer Holiday Club 2026' }), (l) => l.click(), { zoom: 1.6, hold: 3 });
    await go('/admin/posts');
    await step('The bin moves a page to the Bin.', main().getByRole('button', { name: 'Move Summer Holiday Club 2026 to the Bin' }), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await step('Pages in the Bin can be put back, or deleted for good.', btn(/^delete Bin|Bin \(/), (l) => l.click(), { zoom: 1.4, hold: 3.2 });
  });

  await part('Redirects', async () => {
    await step('Redirects are short addresses like destinytees.uk/give, for flyers, posters and socials.', await siteLink(/Redirects/), (l) => l.click(), { hold: 3.2 });
    await step('New redirect.', btn(/New redirect/), (l) => l.click(), { zoom: 1.5 });
    await step('A label, to remember what it’s for…', page.getByPlaceholder('e.g. Alpha Sign Up'), null, { zoom: 1.5, typing: { text: 'Carol singing' } });
    await step('…the short address…', page.getByPlaceholder('alpha-signup'), null, { zoom: 1.5, typing: { text: 'carols' } });
    await step('…and where it goes. It can be anywhere: a page, a ChurchSuite form, a video.', page.getByPlaceholder('https://destinytees.churchsuite.com/...'), null, { zoom: 1.5, typing: { text: 'https://destinytees.uk/carols' } });
    await step('Create redirect.', btn('Create redirect', true), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
    await look('Print it once, then change where it goes as often as you like.', main().getByText('/carols', { exact: true }).first(), { zoom: 1.5, hold: 3 });
    await step('Get a QR code for it, ready for a poster.', main().getByRole('button', { name: 'Get a QR code for /carols' }), (l) => l.click(), { zoom: 1.4, hold: 3 });
    await page.keyboard.press('Escape');
    await settle(400);
    await step('The switch turns one off for a while. The bin deletes it.', page.getByLabel('Deactivate /youth'), (l) => l.click(), { zoom: 1.6, hold: 2.8 });
  });

  await part('The status page', async () => {
    await step('The status page at status.destinytees.uk tells everyone when something isn’t working.', await siteLink(/Status page/), (l) => l.click(), { hold: 3.2 });
    await step('New incident.', btn(/New incident/), (l) => l.click(), { zoom: 1.5 });
    await step('Choose the type: an outage, an amber alert when something’s slow, or planned maintenance.', main().getByText('Amber alert', { exact: true }).first(), (l) => l.click(), { zoom: 1.6, hold: 2.8 });
    await step('Say what’s wrong…', page.getByPlaceholder('e.g. Destiny One messages are slow to send'), null, { zoom: 1.5, typing: { text: 'Sermons are slow to start playing' } });
    await step('…tick what’s affected…', page.getByLabel('Sermons', { exact: true }), (l) => l.check(), { zoom: 1.6 });
    await step('…and what people will notice, and what you’re doing about it.', main().locator('textarea').first(), null, { zoom: 1.4, typing: { text: 'Sermons may take a few seconds to start. We’re looking into it.' } });
    await step('Post to status page.', btn('Post to status page', true), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
    await look('Add updates as the fix goes, and resolve it when it’s working again.', main().getByText('Sermons are slow to start playing').first(), { zoom: 1.3, hold: 3.4 });
  });

  await part('Analytics', async () => {
    await step('Analytics shows which short links, QR codes and tiles people actually use.', await siteLink(/Analytics/), (l) => l.click(), { hold: 3.4 });
    await look('Clicks over time, the most-used links, and where people came from.', null, { hold: 3.4 });
    await step('In person counts taps on the NFC tiles and visits to the links pages.', main().getByText('In person', { exact: true }).first(), (l) => l.click(), { zoom: 1.4, hold: 3 });
    await step('Choose the time range: today, a week, a month, three months or all time.', main().getByText('90 days', { exact: true }).first(), (l) => l.click(), { zoom: 1.5, hold: 2.8 });
    await look('Whole site shows visits to the entire website.', main().getByText('Whole site', { exact: true }).first(), { zoom: 1.6, hold: 2.6 });
  });

  await part('DestinyAI', async () => {
    await step('DestinyAI can write pages and set things up for you in plain English.', sidebar().getByRole('link', { name: /DestinyAI/ }).first(), (l) => l.click(), { hold: 2.8 });
    await look('Ask for a draft post, a banner or a redirect. It suggests a plan, and nothing changes until you confirm it.', main().getByPlaceholder('Ask DestinyAI to do something'), { zoom: 1.3, hold: 4.4 });
  });
});
