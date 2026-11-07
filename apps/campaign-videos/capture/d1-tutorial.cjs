// Films the Destiny One Admin tutorial: access requests, invites, app members, communities and
// groups, feedback and app settings, on the real /admin. The Destiny One API is answered in the
// browser by capture/d1-fake-api.cjs (invented people), with capture/d1-seed.cjs for the rest of the
// pretend site. How to run it: the top of capture/tutorial-kit.cjs. Message content is Safeguarding's
// alone, so it isn't in this video.
const { film } = require('./tutorial-kit.cjs');
const { install } = require('./d1-fake-api.cjs');

film({ id: 'd1', roles: 'destiny_one_admin' }, async (t) => {
  const { page, ctx, part, step, look, go, settle, btn, sidebar, main } = t;
  await install(ctx);
  const card = (name) => main().getByRole('link', { name: new RegExp(`^${name}`) }).first();
  const modal = () => page.locator('[data-tour="modal"]').last();

  await part('Finding your way', async () => {
    await go('/admin/destiny-one', { wait: 2500 });
    await look('Destiny One is the members’ app for teams and groups. This is where you look after who’s in it.', main().getByRole('heading', { name: 'Destiny One' }).first(), { zoom: 1.3, hold: 3.6 });
    await look('The numbers at the top: who’s waiting for approval, active members, open invites and any paused groups.', main().getByText('Waiting for approval').first(), { zoom: 1.4, hold: 3.6 });
    await look('Message content is never shown here. Only Safeguarding can review a conversation, and every read is recorded.', main().getByText(/message content is only ever visible to Safeguarding/).first(), { zoom: 1.5, hold: 4 });
  });

  await part('Access requests', async () => {
    await step('Access requests are people who signed in without an invite and asked to join.', card('Access requests'), (l) => l.click(), { zoom: 1.3, hold: 3, wait: 2500 });
    await look('Each shows what they told us, including whether they say they’re an adult. You decide, not them.', main().getByText(/Says they're an adult/).first(), { zoom: 1.6, hold: 3.8 });
    await step('Review to approve someone.', main().getByRole('button', { name: 'Review' }).first(), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await step('Check the name everyone in their groups will see…', page.locator('#d1-name'), null, { zoom: 1.6, hold: 2.6 });
    await step('…confirm their age. Only adults you confirm count towards the two-adult rule in groups.', modal().getByRole('button', { name: 'Adult (18+)' }), (l) => l.click(), { zoom: 1.6, hold: 3.8 });
    await step('…and add them to communities straight away if you like.', modal().getByLabel('Destiny Church'), (l) => l.check(), { zoom: 1.6, hold: 2.6 });
    await step('Approve, and they’re in.', modal().getByRole('button', { name: 'Approve', exact: true }), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
    await look('Decline if they shouldn’t use the app. You can reinstate them later from App members.', main().getByRole('button', { name: 'Decline' }).first(), { zoom: 1.7, hold: 3.4 });
  });

  await part('Invites', async () => {
    await go('/admin/destiny-one/invites', { wait: 2500 });
    await look('Invites let people in as soon as they sign in with that email, with the details you set.', main().getByRole('heading', { name: 'Invites' }).first(), { zoom: 1.3, hold: 3.4 });
    await step('Invite people.', btn(/Invite people/), (l) => l.click(), { zoom: 1.6, hold: 2 });
    await step('Their full name…', page.locator('#inv-name'), null, { zoom: 1.6, typing: { text: 'Naomi Fraser' } });
    await step('…their email…', page.locator('#inv-email'), null, { zoom: 1.6, typing: { text: 'naomi.fraser@example.com' } });
    await look('…their age…', modal().getByRole('button', { name: 'Adult (18+)' }), { zoom: 1.6, hold: 2.2 });
    await step('…a leader role, if they lead a group…', modal().getByLabel('CG Leader'), (l) => l.check(), { zoom: 1.6, hold: 2.6 });
    await step('…and which communities they join.', modal().getByLabel('Destiny Church'), (l) => l.check(), { zoom: 1.6, hold: 2.4 });
    await look('Several people lets you paste a list, one per line, all with the same age, roles and communities.', modal().getByRole('button', { name: 'Several people' }), { zoom: 1.6, hold: 3.6 });
    await step('Send invite. They get an email telling them to open the app.', modal().getByRole('button', { name: 'Send invite' }), (l) => l.click(), { zoom: 1.6, hold: 2.8 });
    await step('Expired invites can be sent again.', main().getByRole('button', { name: /^Expired/ }).first(), (l) => l.click(), { zoom: 1.6, hold: 1.8 });
    await look('Resend gives them a fresh link. Revoke cancels an invite that hasn’t been used.', main().getByRole('button', { name: 'Resend' }).first(), { zoom: 1.7, hold: 3.4 });
  });

  await part('App members', async () => {
    await go('/admin/destiny-one/members', { wait: 2500 });
    await look('App members is everyone with an account: their age, leader roles and status.', main().locator('ul').first(), { zoom: 1.2, hold: 3.4 });
    await step('Filter by status, age or role.', main().getByRole('button', { name: /^Under 18/ }).first(), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
    await main().getByRole('button', { name: /^All/ }).nth(1).click().catch(() => {});
    await settle(400);
    await step('Open someone to change their details.', main().getByText('Ben Hughes').first(), (l) => l.click(), { zoom: 1.4, hold: 2.4, wait: 1200 });
    await look('Correct their name or age here. Making someone under 18 can pause groups that counted them as an adult.', modal().getByText('Correct their age').first(), { zoom: 1.5, hold: 4 });
    await step('Leader roles are for adults only.', modal().getByLabel('Senior Leader'), (l) => l.check(), { zoom: 1.6, hold: 2.6 });
    await look('Suspend stops them using the app until you reinstate them. Delete account removes them and their data for good.', modal().getByRole('button', { name: 'Suspend' }), { zoom: 1.6, hold: 4 });
    await step('Save changes.', modal().getByRole('button', { name: 'Save changes' }), (l) => l.click(), { zoom: 1.6, hold: 2.2 });
    await page.keyboard.press('Escape').catch(() => {});
    await settle(400);
  });

  await part('Communities and groups', async () => {
    await go('/admin/destiny-one/communities', { wait: 2500 });
    await look('Each community has an Announcements channel everyone is in, plus groups for each team.', main().getByText(/Each community has an Announcements channel/).first(), { zoom: 1.4, hold: 3.8 });
    await look('A group pauses on its own if it drops below 3 people or 2 adults, so no one is ever alone with a young person.', main().getByText(/paused/).first(), { zoom: 1.6, hold: 4.2 });
    await step('Open a community.', main().getByText('Destiny Church', { exact: true }).first(), (l) => l.click(), { zoom: 1.4, hold: 2.4, wait: 2500 });
    await look('Its groups, how many people and adults are in each, and why any are paused.', main().getByText('Media Team').first(), { zoom: 1.5, hold: 3.6 });
    await step('New group.', btn(/New group/), (l) => l.click(), { zoom: 1.6, hold: 2 });
    await step('Give it a name…', page.locator('#g-name'), null, { zoom: 1.6, typing: { text: 'Kids Church Team' } });
    await step('…and a department…', page.locator('#g-dept'), null, { zoom: 1.6, typing: { text: 'Kids' } });
    await step('…and choose who’s in it.', modal().getByLabel(/Grace Wilson/), (l) => l.check(), { zoom: 1.6, hold: 1.6 });
    await modal().getByLabel(/Hannah Clarke/).check();
    await settle(300);
    await step('The rule checks itself as you go.', modal().getByLabel(/Priya Shah/), (l) => l.check(), { zoom: 1.6, hold: 1.2 });
    await look('Three people, two of them adults: it meets the rules. Fewer, and it starts paused until it does.', modal().getByRole('status'), { zoom: 1.7, hold: 4 });
    await step('Choose who looks after it…', modal().getByRole('group', { name: /Group admins/ }).getByLabel(/Grace Wilson/), (l) => l.check(), { zoom: 1.6, hold: 2.4 });
    await step('…and Create group.', modal().getByRole('button', { name: 'Create group' }), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
    await step('Open a group to add or remove people, or make someone its admin.', main().getByText('Media Team').first(), (l) => l.click(), { zoom: 1.4, hold: 2.6, wait: 1500 });
    await look('Add someone with a second adult and the paused group starts again.', modal().getByRole('button', { name: /Add people/ }).first(), { zoom: 1.6, hold: 3.4 });
    await page.keyboard.press('Escape').catch(() => {});
    await settle(400);
    await look('Add people here puts them in the community and its Announcements.', main().getByRole('button', { name: 'Add people' }).first(), { zoom: 1.6, hold: 3.2 });
  });

  await part('Feedback and settings', async () => {
    await go('/admin/destiny-one/feedback', { wait: 2500 });
    await look('App feedback is problems and ideas sent from the app. Anything that sounds like a safeguarding concern goes to the safeguarding team straight away.', main().getByText(/safeguarding concern/).first(), { zoom: 1.4, hold: 4.4 });
    await step('Mark one done once it’s dealt with.', main().getByRole('button', { name: 'Mark as done' }).first(), (l) => l.click(), { zoom: 1.6, hold: 2.4 });
    await go('/admin/destiny-one/settings', { wait: 2500 });
    await look('Let people ask to join. Turn it off to make the app invite-only.', main().getByText('Let people ask to join').first(), { zoom: 1.6, hold: 3.4 });
    await look('How long invites last before they expire.', page.locator('#s-expiry'), { zoom: 1.6, hold: 2.8 });
    await look('App versions: stop very old versions working, or tell people an update is available.', main().getByText('App versions').first(), { zoom: 1.5, hold: 3.6 });
    await look('Maintenance shows a message in the app instead, while something’s being fixed.', main().getByText('Maintenance', { exact: true }).first(), { zoom: 1.5, hold: 3.4 });
  });
});
