// Films the Super Admin tutorial: who can do what, the audit log, the sitewide banner, the cache
// and previewing other roles, on the real /admin, against the pretend site in
// capture/super-seed.cjs. How to run it: the top of capture/tutorial-kit.cjs. "Ask the log" needs an
// AI key, so it's explained, not asked.
const { film } = require('./tutorial-kit.cjs');

film({ id: 'super', roles: 'super_admin' }, async (t) => {
  const { page, part, step, look, go, settle, btn, sidebar, main, field } = t;
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
    await look('A Super Admin can open every section. The other videos in Help cover each one.', sidebar(), { zoom: 1.2, hold: 3.6 });
    await look('HR and Destiny One are hidden until you ask for them, so private details aren’t on screen by accident.', btn(/Show HR pages/), { zoom: 1.6, hold: 3.6 });
    await step('Show HR pages puts them in the sidebar while you need them.', btn(/Show HR pages/), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
  });

  await part('Users and roles', async () => {
    await step('Users is who can sign in to the admin, and what each person can reach.', await siteLink(/Users/), (l) => l.click(), { hold: 3 });
    await look('Each person shows their roles. Filter by a role to see who has it.', btn(/^Sermon Admin/), { zoom: 1.4, hold: 3.2 });
    await step('Add user.', btn(/Add user/), (l) => l.click(), { zoom: 1.5 });
    await step('Their email…', field('Email'), null, { zoom: 1.5, typing: { text: 'esther.mensah@example.com' } });
    await step('…a first password they’ll change when they sign in…', field('Temporary password'), null, { zoom: 1.5, typing: { text: 'Welcome2026!' } });
    await step('…and tick what they look after. Give people only what they need.', page.getByLabel(/Design Admin/).first(), (l) => l.check(), { zoom: 1.4, hold: 3 });
    await look('Safeguarding Admin is the only role that can read Destiny One messages, and every read is recorded.', page.getByText(/The only role that can read messages/).first(), { zoom: 1.5, hold: 3.8 });
    await step('Add them. They set up two-factor sign-in the first time they log in.', btn('Save', true), (l) => l.click(), { zoom: 1.4, hold: 2.8 });
    await step('Edit changes someone’s roles.', main().getByRole('button', { name: 'Edit ben.hughes@example.com' }), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
    await btn('Cancel', true).click().catch(() => page.keyboard.press('Escape'));
    await settle(400);
    await look('Reset two-factor sign-in is for someone who’s lost their phone and their backup codes. They set it up again next time.', main().getByRole('button', { name: 'Reset two-factor sign-in for ben.hughes@example.com' }), { zoom: 1.7, hold: 4 });
    await look('Remove takes away their access to the admin.', main().getByRole('button', { name: 'Remove ben.hughes@example.com' }), { zoom: 1.7, hold: 2.8 });
  });

  await part('The audit log', async () => {
    await step('The audit log records everything anyone does in the admin.', sidebar().getByRole('link', { name: /Audit Log/ }).first(), (l) => l.click(), { hold: 3 });
    await look('Who did what, and when, newest first. Open any entry for the detail.', main().getByText(/Gave ben.hughes@example.com Sermon Admin/).first(), { zoom: 1.3, hold: 3.4 });
    await step('Narrow it down by time…', btn('7 days', true), (l) => l.click(), { zoom: 1.5 });
    await step('…by area…', btn(/^Site/), (l) => l.click(), { zoom: 1.5 });
    await step('…or search for something.', page.getByPlaceholder('Search what happened'), async () => { await btn(/^All areas/).click(); }, { zoom: 1.5, typing: { text: 'popup' } });
    await look('The Ask tab answers questions about the log in plain English, like who added the last product.', main().getByText('Ask', { exact: true }).first(), { zoom: 1.6, hold: 3.6 });
    await step('Weekly reports sums up each week.', main().getByText('Weekly reports', { exact: true }).first(), (l) => l.click(), { zoom: 1.4, hold: 2.8 });
  });

  await part('The sitewide banner', async () => {
    if (!(await sidebar().getByRole('link', { name: /^Banner/ }).first().isVisible())) {
      await sidebar().getByText('Announcements', { exact: true }).first().click();
      await settle(400);
    }
    await step('Banner is the strip across the top of every page. Only a Super Admin can change it.', sidebar().getByRole('link', { name: /^Banner/ }).first(), (l) => l.click(), { hold: 2.8 });
    await look('Choose the kind: an announcement, a notice or an alert.', page.locator('input[type="radio"]').first(), { zoom: 1.4, hold: 3 });
    await step('Write the message…', page.getByPlaceholder('Service times are changing this Sunday…'), null, { zoom: 1.5, typing: { text: 'Christmas services: 20 December at 10:30am and 6pm' } });
    await step('…add a link…', page.getByPlaceholder('/whats-on'), async () => { await page.getByPlaceholder('Find out more').fill('See the times'); }, { zoom: 1.5, typing: { text: '/christmas' } });
    await step('…and, if you like, when it shows and hides on its own.', field('Hide after (optional)'), (l) => l.fill('2026-12-26T00:00'), { zoom: 1.5, hold: 2.6 });
    await step('Save changes.', btn('Save changes', true), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
  });

  await part('Cache and previews', async () => {
    await step('Clear Cache: if new events or changes aren’t showing on the website yet, this rebuilds those pages now.', await siteLink(/Clear Cache/), (l) => l.click(), { hold: 3.4 });
    await step('Clear Cache.', btn(/Clear Cache/), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await step('Onboarding shows the admin as each role sees it.', await siteLink(/Onboarding/), (l) => l.click(), { hold: 2.8 });
    await step('Preview as a role to see exactly what they see.', btn(/Preview as Store/), (l) => l.click(), { zoom: 1.5, hold: 3 });
    await look('The sidebar narrows to that role. It’s only a preview: you’re still a Super Admin.', sidebar(), { zoom: 1.2, hold: 3.6 });
  });
});
