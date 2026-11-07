// Films the Safeguarding Admin tutorial: the queue, a reported message, reviewing a conversation,
// pausing a group and blocks, on the real /admin. The Destiny One API, safeguarding included, is
// answered in the browser by capture/d1-fake-api.cjs, so the conversation shown is invented and no
// real message is ever opened. The rest of the pretend site is capture/d1-seed.cjs. How to run it:
// the top of capture/tutorial-kit.cjs.
const { film } = require('./tutorial-kit.cjs');
const { install } = require('./d1-fake-api.cjs');

film({ id: 'safeguarding', roles: 'safeguarding_admin' }, async (t) => {
  const { page, ctx, part, step, look, go, settle, btn, main } = t;
  await install(ctx);
  const modal = () => page.locator('[data-tour="modal"]').last();
  const dialog = () => page.getByRole('dialog').last();
  const tab = (name) => main().getByRole('button', { name: new RegExp(`^${name}`) }).first();

  await part('Finding your way', async () => {
    await go('/admin/destiny-one/safeguarding');
    await look('Safeguarding is where concerns from Destiny One come to you: reported messages and paused groups.', main().getByRole('heading', { name: 'Safeguarding' }).first(), { zoom: 1.3, hold: 3.8 });
    await look('Only the Safeguarding Admin role can read a conversation. Not even a Super Admin can without it.', main().getByText(/Opening a conversation needs a reason/).first(), { zoom: 1.5, hold: 4 });
  });

  await part('The queue', async () => {
    await look('The queue is everything waiting for you: new reports and groups that paused on their own.', tab('Queue'), { zoom: 1.6, hold: 3.4 });
    await look('A group pauses when it drops below 3 people or 2 adults. Members can read it but not post until it meets the rule again.', main().getByText(/Paused automatically/).first(), { zoom: 1.5, hold: 4.4 });
    await step('Mark handled once you’ve checked it.', main().getByRole('listitem').filter({ hasText: 'Paused automatically' }).getByRole('button', { name: 'Mark handled' }), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
  });

  await part('A reported message', async () => {
    await step('Reports shows each reported message.', tab('Reports'), (l) => l.click(), { zoom: 1.6, hold: 2.2 });
    await look('Why it was reported, the message itself, and who reported it.', main().getByText(/move the chat to Snapchat/).first(), { zoom: 1.5, hold: 3.8 });
    await step('Review conversation to see it in context.', btn('Review conversation', true), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await look('Reading a conversation is recorded: your name, the reason and the dates go in the audit log.', modal().getByText(/You are about to read a private conversation/).first(), { zoom: 1.6, hold: 4 });
    await step('Give the reason…', page.locator('#t-reason'), null, { zoom: 1.6, typing: { text: 'Report #12: adult asked a young person to move to Snapchat' } });
    await look('…and the dates to read. It starts at the last 30 days.', page.locator('#t-from'), { zoom: 1.6, hold: 3 });
    await step('Open conversation.', modal().getByRole('button', { name: 'Open conversation' }), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await look('Everyone who has been in the group, with their age and when they joined.', modal().getByText('Everyone who has been in this group').first(), { zoom: 1.5, hold: 3.6 });
    await look('Then every message in those dates, including earlier versions of edited ones and anything deleted.', modal().getByText(/Version 1, replaced/).first(), { zoom: 1.6, hold: 4.2 });
    await step('Close when you’re done.', modal().getByRole('button', { name: 'Close', exact: true }).last(), (l) => l.click(), { zoom: 1.6, hold: 2 });
    await step('Remove message takes it down for everyone. Members see “This message was deleted”, and the content is kept for review.', main().getByRole('button', { name: 'Remove message' }), (l) => l.click(), { zoom: 1.6, hold: 3.4 });
    await step('Say why. It goes in the audit log.', dialog().locator('input').first(), null, { zoom: 1.6, typing: { text: 'Report #12: moving a young person to a private app' } });
    await step('Remove message.', dialog().getByRole('button', { name: 'Remove message' }), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await look('Suspend sender stops them using Destiny One while you look into it. Any group left short of adults pauses on its own.', main().getByRole('button', { name: 'Suspend sender' }), { zoom: 1.6, hold: 4.4 });
    await look('Anything serious goes to the church’s safeguarding lead as well, the same as any other concern.', main().getByText(/Reported by/).first(), { zoom: 1.5, hold: 3.8 });
    await step('Close report, with a note on what was done.', btn('Close report', true), (l) => l.click(), { zoom: 1.6, hold: 2.2 });
    await step('The note stays with the report.', dialog().locator('input').first(), null, { zoom: 1.6, typing: { text: 'Message removed. Spoke to Daniel and passed to the safeguarding lead.' } });
    await step('Close report.', dialog().getByRole('button', { name: 'Close report' }), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
  });

  await part('Groups and blocks', async () => {
    await step('All groups lets you review or pause any group.', tab('All groups'), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await step('Pause a group while you look into something. It becomes read-only.', main().getByRole('listitem').filter({ hasText: 'Welcome Team' }).getByRole('button', { name: 'Pause' }), (l) => l.click(), { zoom: 1.6, hold: 2.8 });
    await step('The reason is shown to the group’s members.', dialog().locator('input').first(), null, { zoom: 1.6, typing: { text: 'Paused while the church team looks into something.' } });
    await step('Pause group.', dialog().getByRole('button', { name: 'Pause group' }), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await look('Lift pause when you’re done. If it doesn’t meet the rule it stays paused on its own.', main().getByRole('button', { name: 'Lift pause' }).first(), { zoom: 1.7, hold: 3.6 });
    await step('Blocks shows when someone blocks another member.', tab('Blocks'), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await look('Their messages are hidden only for the person who blocked them. Nothing is ever hidden from you.', main().getByText(/blocked Tom Reid/).first(), { zoom: 1.6, hold: 4 });
    await settle(200);
  });
});
