// Films the Sermon Admin tutorial: publishing sermon audio to the podcast, series, and speakers, on
// the real /admin, against the pretend site in capture/sermons-seed.cjs. How to run it: the top of
// capture/tutorial-kit.cjs.
//
// Recent episodes are the church's real ones, read from its public podcast feed. Publishing is
// answered in the browser (POST /api/admin/sermons/upload): the filming copy has no Buzzsprout key,
// so nothing is published. Adding a series and the AI speaker review need YouTube and OpenAI keys,
// so they are shown and explained, not pressed.
const path = require('path');
const { film } = require('./tutorial-kit.cjs');

film({ id: 'sermons', roles: 'sermon_admin' }, async (t) => {
  const { page, ctx, part, step, look, go, btn, sidebar, main } = t;
  await ctx.route('**/api/admin/sermons/upload', (r) => (r.request().method() === 'POST' ? r.fulfill({ json: { ok: true } }) : r.continue()));

  await part('Finding your way', async () => {
    await go('/admin');
    await step('Signed in as a Sermon Admin, Sermons is your section.', sidebar().getByRole('link', { name: /Sermons/ }).first(), (l) => l.click(), { hold: 2.6 });
    await look('Videos still go to YouTube as normal. This page puts the audio on the podcast, so people can listen anywhere.', main().getByText(/Publish sermon audio to the podcast feed/).first(), { zoom: 1.4, hold: 4 });
  });

  await part('Publish a sermon', async () => {
    await step('Give it the sermon’s title…', page.getByPlaceholder('Walking In Faith'), null, { zoom: 1.5, typing: { text: 'Christmas Changes Everything' } });
    await step('…who preached…', page.getByPlaceholder('Ps John Smith'), null, { zoom: 1.5, typing: { text: 'Ps Jonathan Harris' } });
    await step('…and, once it’s on YouTube, the video’s id, to link the two. Leave it blank if you’re publishing the audio first.', page.getByPlaceholder('e.g. dQw4w9WgXcQ'), null, { zoom: 1.5, typing: { text: 'aB3dE5fG7hJ' }, hold: 3.6 });
    await step('Add any notes for the episode…', main().locator('textarea').first(), null, { zoom: 1.4, typing: { text: 'Luke 2. The first of our Christmas series.' } });
    await step('…and choose the audio file.', main().getByText('Choose an audio file').first(), async () => {
      await main().locator('input[type="file"]').first().setInputFiles(path.join(__dirname, 'files', 'sermon-sample.mp3'));
      await page.waitForTimeout(600);
    }, { zoom: 1.4, hold: 2.4 });
    await step('Publish to Buzzsprout. It goes out on the podcast, and shows under Recently published episodes.', btn('Publish to Buzzsprout', true), (l) => l.click(), { zoom: 1.5, hold: 3.4 });
  });

  await part('Series and speakers', async () => {
    await step('Series: paste a YouTube playlist and Add series, and it becomes a series people can filter by on the sermons page.', page.getByPlaceholder('Paste a playlist URL or id'), null, { zoom: 1.4, typing: { text: 'https://www.youtube.com/playlist?list=PLdestinyChristmas' }, hold: 3.8 });
    await look('AI speaker review checks every sermon for who preached and fixes it where it’s wrong or missing.', btn('Review speakers with AI', true), { zoom: 1.5, hold: 3.6 });
    await look('Manual speaker edit: search for a sermon and correct its speaker yourself.', page.getByPlaceholder('Search sermons by title or speaker'), { zoom: 1.5, hold: 3.4 });
    await look('Recently published episodes are what’s on the podcast now.', main().getByText('Recently published episodes').first(), { zoom: 1.3, hold: 3.2 });
  });
});
