// Films the Training Admin tutorial: categories, sub-groups (with passwords), folders and posts, on
// the real /admin, against the pretend site in capture/training-seed.cjs. How to run it: the top of
// capture/tutorial-kit.cjs.
const { film } = require('./tutorial-kit.cjs');

film({ id: 'training', roles: 'training_admin' }, async (t) => {
  const { page, part, step, look, go, settle, btn, sidebar, main } = t;
  const dialog = () => page.locator('div').filter({ has: page.getByRole('button', { name: /^Create|^Save Folder/ }) }).last();

  await part('Finding your way', async () => {
    await go('/admin');
    await look('Signed in as a Training Admin, Training is your section: everything the teams learn from.', sidebar(), { zoom: 1.3, hold: 3.2 });
    await step('Open Training.', sidebar().getByRole('link', { name: /Training/ }).first(), (l) => l.click(), { zoom: 1.5 });
    await look('Training is in three levels: categories, like Welcome Team; sub-groups inside them, like Hosts; and the posts people read.', main().locator('table tbody tr, ul li').first(), { zoom: 1.2, hold: 4.2 });
  });

  await part('Categories', async () => {
    await step('New category.', btn(/New category/), (l) => l.click(), { zoom: 1.5 });
    await step('Give it a name…', page.getByPlaceholder('e.g. Production'), null, { zoom: 1.5, typing: { text: 'Kids Church' } });
    await step('…pick an icon for the public page…', page.getByText('Icon', { exact: true }).first().locator('xpath=following::button[23]'), (l) => l.click(), { zoom: 1.6 });
    await step('…and a line about it.', page.getByPlaceholder('One line shown under the category heading.'), null, { zoom: 1.5, typing: { text: 'For everyone serving with our 0 to 11s.' } });
    await look('Published shows it on the public training page. Turn it off while you’re still building it.', page.getByText('Visible on the public /training page.').first(), { zoom: 1.6, hold: 3.2 });
    await step('Create category.', btn('Create category', true), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
    await look('Filter by published or hidden, search, or tick several to change them together.', btn(/^Hidden/), { zoom: 1.5, hold: 3.2 });
    await step('Open the new category.', main().getByRole('link', { name: /Kids Church/ }).first(), (l) => l.click(), { zoom: 1.4 });
  });

  await part('Sub-groups', async () => {
    await step('Inside a category are its sub-groups, one for each team. New sub-group.', btn(/New sub-group/), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
    await step('Name it…', page.getByPlaceholder('e.g. Sound'), null, { zoom: 1.5, typing: { text: 'Leaders' } });
    await step('…describe it…', page.getByPlaceholder('One line shown on the sub-group card.'), null, { zoom: 1.5, typing: { text: 'Safeguarding, check-in and running a group.' } });
    await step('…and add a password if only that team should read it. It’s stored securely, so nobody can look it up later.', page.getByPlaceholder('Set a password to protect this group'), null, { zoom: 1.5, typing: { text: 'kids2026' }, hold: 3.6 });
    await step('Create sub-group.', btn('Create sub-group', true), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
    await look('Password set and Open show which groups are protected.', btn(/^Password set/), { zoom: 1.6, hold: 3 });
    await step('Open it to add its posts.', main().getByRole('link', { name: /Leaders/ }).first(), (l) => l.click(), { zoom: 1.4 });
  });

  await part('Folders and posts', async () => {
    await step('Folders keep a group’s posts in order. New Folder.', btn(/New Folder/), (l) => l.click(), { zoom: 1.5 });
    await step('Name it, and save.', page.getByPlaceholder('e.g. Core Values'), async () => { await btn('Save Folder', true).click(); }, { zoom: 1.5, typing: { text: 'Before your first Sunday' }, hold: 2.6 });
    await step('New post.', btn(/New post/), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
    await step('Give it a title…', page.getByPlaceholder('Post title'), null, { zoom: 1.5, typing: { text: 'Checking children in' } });
    await step('…put it in a folder…', main().locator('select').first(), (l) => l.selectOption({ label: 'Before your first Sunday' }), { zoom: 1.6 });
    await step('…say how long it takes to read…', page.getByPlaceholder(/Min read time/), null, { zoom: 1.6, typing: { text: '3' } });
    await step('…and a one-line summary for the list.', page.getByPlaceholder(/One-line summary/), null, { zoom: 1.5, typing: { text: 'How check-in works, and what to do if a parent is late.' } });
    const body = page.locator('[contenteditable=true]').first();
    await step('Then write it. Blocks add FAQs, callouts and cards, the same as website pages.', body, null, { zoom: 1.3, typing: { text: 'Every child is checked in at the welcome desk and gets a matching sticker with their parent. Only the parent with the matching sticker can collect them.', fill: false } });
    await step('Turn on Published so the team can see it…', page.getByText('Published', { exact: true }).first().locator('xpath=following::button[1]'), (l) => l.click(), { zoom: 1.7 });
    await step('…and Create post.', btn('Create post', true), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
    await look('The post is in its folder, which shows how many posts it holds. Drag folders to reorder them.', main().getByText('Before your first Sunday').first(), { zoom: 1.5, hold: 3.2 });
    await step('Open the folder to see its posts, and edit or delete any of them.', main().getByText('Before your first Sunday').first(), (l) => l.click(), { zoom: 1.3, hold: 3.2 });
  });

  await part('What the team sees', async () => {
    await step('The team reads it all at destinytees.uk/training.', null, async () => { await go('/training'); }, { hold: 3 });
    await step('Open Kids Church…', page.getByRole('link', { name: /Kids Church/ }).first(), (l) => l.click(), { zoom: 1.3, hold: 2.4 });
    await look('Protected groups are marked, and ask for the password before anything opens.', page.getByText('Leaders', { exact: true }).first(), { zoom: 1.3, hold: 3.2 });
  });
});
