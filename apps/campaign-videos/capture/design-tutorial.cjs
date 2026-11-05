// Films the Design Admin tutorial: picking up a design ticket, delivering files and closing it, on
// the real /admin, against the pretend site in capture/design-seed.cjs. How to run it: the top of
// capture/tutorial-kit.cjs. Emails to the person who asked can't go anywhere: the filming copy has
// no email key.
const path = require('path');
const { film, PHOTOS } = require('./tutorial-kit.cjs');

film({ id: 'design', roles: 'design_admin' }, async (t) => {
  const { page, part, step, look, go, btn, sidebar, main } = t;

  await part('Finding your way', async () => {
    await go('/admin');
    await step('Signed in as a Design Admin, Design tickets is your section: everything the church asks you to design.', sidebar().getByRole('link', { name: /Design tickets/ }).first(), (l) => l.click(), { hold: 3.2 });
    await look('Each ticket has its number, what’s wanted, who asked, when it’s needed by and where it’s up to.', main().locator('table tbody tr').first(), { zoom: 1.3, hold: 3.6 });
    await look('The lightning bolt means fast-tracked: something urgent, so it goes to the top.', main().getByText('DT-0142').first(), { zoom: 1.8, hold: 3 });
    await step('Needs someone shows what nobody’s picked up yet. Mine shows yours.', btn(/^Mine/), (l) => l.click(), { zoom: 1.5, hold: 2.8 });
    // Back to everyone's: Mine has its own All, the last one.
    await page.getByRole('button', { name: /^All/ }).locator('visible=true').last().click();
    await t.settle(400);
  });

  await part('Pick up a ticket', async () => {
    await step('Open a ticket to read the brief.', main().getByText('Carols by candlelight poster').first(), (l) => l.click(), { zoom: 1.3, hold: 2.6 });
    await look('The brief, the sizes they need, and who asked, with a way to get in touch.', main().getByText('The brief').first(), { zoom: 1.3, hold: 3.6 });
    await step('Claim this to make it yours, so nobody else starts it too.', btn('Claim this', true), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
    await step('Start work when you begin. The person who asked can see where it’s up to.', btn(/Start work|In progress|Start/), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
  });

  await part('Deliver it', async () => {
    await step('Upload the finished file under Deliverables: an image or a PDF, up to 50 MB.', main().getByText('Upload a file').first(), async () => {
      await main().locator('input[type="file"]').first().setInputFiles(path.join(PHOTOS, 'hero-river.webp'));
      await page.waitForTimeout(3000);
    }, { zoom: 1.4, hold: 2.8 });
    await look('For a video, choose Video link and paste a Google Drive or Playbook link instead.', main().getByText('Video link').first(), { zoom: 1.6, hold: 3.2 });
    await step('Mark it delivered and they’re told it’s ready.', btn(/Deliver|Mark delivered|Send/), (l) => l.click(), { zoom: 1.6, hold: 2.8 });
    await look('If they want changes, it comes back as Changes requested, and you upload the next version.', main().getByText('Activity').first(), { zoom: 1.3, hold: 3.4 });
  });

  await part('Notes and closing', async () => {
    const note = main().getByPlaceholder('Anything worth recording against this ticket.');
    await step('Add a note to record anything worth knowing.', note, null, { zoom: 1.5, typing: { text: 'Printed 20 copies at the office for the foyer.' } });
    await look('The switch keeps a note internal, just for the design team. Turn it off to share it with the person who asked.', main().getByText(/Only the design team will see this/).first(), { zoom: 1.6, hold: 3.6 });
    await step('Add note. It joins the ticket’s activity.', btn('Add note', true), (l) => l.click(), { zoom: 1.4, hold: 2.6, wait: 2500 });
    await go('/admin/design');
    await look('Close tickets once they’re done. Cancel one that’s no longer needed: it keeps the history. Delete removes it for good.', main().locator('table').first(), { zoom: 1.2, hold: 4 });
  });
});
