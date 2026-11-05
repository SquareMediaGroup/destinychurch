// Films the HR Admin tutorial: staff, leave, reviews, documents, checklists, jobs and applications,
// on the real /admin, against the pretend site in capture/hr-seed.cjs. How to run it: the top of
// capture/tutorial-kit.cjs. Every person in it is invented. Emails HR would send (a staff portal
// invite, a leave decision) can't go anywhere: the filming copy has no email key.
const path = require('path');
const { film } = require('./tutorial-kit.cjs');

film({ id: 'hr', roles: 'hr_admin' }, async (t) => {
  const { page, part, step, look, go, settle, btn, sidebar, main, field } = t;
  const hrLink = async (name) => {
    const l = sidebar().getByRole('link', { name }).first();
    if (!(await l.isVisible())) {
      await sidebar().getByText('HR', { exact: true }).first().click();
      await settle(400);
    }
    return l;
  };

  await part('Finding your way', async () => {
    await go('/admin');
    await step('Signed in as an HR Admin, HR is your section.', sidebar().getByText('HR', { exact: true }).first(), (l) => l.click(), { zoom: 1.5 });
    await step('The HR home shows who’s waiting for an answer.', await hrLink(/^HR$/), async () => { await go('/admin/hr'); }, { hold: 2.6 });
    await look('Pending leave and upcoming reviews at the top, then every HR section.', main().getByText('Pending leave').first(), { zoom: 1.3, hold: 3.4 });
    await look('Hide HR pages blurs everything at once if someone walks past your screen.', btn(/Hide HR pages/), { zoom: 1.6, hold: 3.2 });
  });

  await part('The staff directory', async () => {
    await step('The staff directory has everyone on the team.', await hrLink(/Staff directory/), (l) => l.click(), { hold: 2.6 });
    await look('Filter by active, on leave or left, or search by name, role or department.', btn(/^On leave/), { zoom: 1.5, hold: 3 });
    await step('Add staff.', btn(/Add staff/), (l) => l.click(), { zoom: 1.5 });
    await step('Their name…', field('First name'), async () => { await field('Last name').fill('Mensah'); }, { zoom: 1.6, typing: { text: 'Esther' } });
    await step('…email…', field('Email'), null, { zoom: 1.6, typing: { text: 'esther.mensah@example.com' } });
    await step('…job, department and how they’re employed…', field('Job title'), async () => {
      await field('Department').fill('Media');
      await field('Employment type').selectOption({ index: 1 });
    }, { zoom: 1.4, typing: { text: 'Media Coordinator' } });
    await step('…when they start, and their holiday allowance.', field('Start date'), async () => {
      await field('Start date').fill('2026-12-01');
      await field('Annual leave (days)').fill('20');
    }, { zoom: 1.5, hold: 2.6 });
    await look('Give them a login to the staff portal to book leave and see their own documents, or link one they already have.', page.getByText('Create a new login').first(), { zoom: 1.4, hold: 4 });
    await step('Add staff.', page.getByRole('button', { name: 'Add staff', exact: true }).last(), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
    await step('Open someone to see everything about them.', main().getByText('Grace Wilson').first(), (l) => l.click(), { zoom: 1.3, hold: 2.4 });
    await look('Their details, leave left, documents, reviews, and their onboarding and leaving checklists, on one page.', null, { hold: 4 });
  });

  await part('Leave', async () => {
    await step('Leave & time-off.', await hrLink(/Leave & time-off/), (l) => l.click(), { hold: 2.4 });
    await look('Requests waiting for you are at the top.', main().getByText(/Awaiting approval/).first(), { zoom: 1.4, hold: 3 });
    await step('Approve…', btn('Approve', true), (l) => l.click(), { zoom: 1.7, hold: 2.4 });
    await look('…or Reject. Holiday balances update as you go.', main().getByText(/Holiday balances/i).first(), { zoom: 1.3, hold: 3.4 });
    await step('Request leave books it for someone.', btn(/Request leave/), (l) => l.click(), { zoom: 1.5 });
    await step('Who it’s for…', field('Staff member'), (l) => l.selectOption({ label: 'Grace Wilson' }), { zoom: 1.6 });
    await step('…holiday, sick or other…', field('Type'), (l) => l.selectOption({ index: 0 }), { zoom: 1.6 });
    await step('…the dates…', field('From'), async () => {
      await field('From').fill('2026-12-28');
      await page.locator('input[type="date"]').locator('visible=true').nth(1).fill('2026-12-31');
    }, { zoom: 1.5 });
    await step('…and Submit request.', btn('Submit request', true), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
  });

  await part('Reviews and documents', async () => {
    await step('Reviews & 1-to-1s keeps a record of every catch-up.', await hrLink(/Reviews & 1-to-1s/), (l) => l.click(), { hold: 2.6 });
    await step('Log review.', btn(/Log review/), (l) => l.click(), { zoom: 1.5 });
    await step('Who, and whether it’s an appraisal or a 1-to-1…', field('Staff member'), (l) => l.selectOption({ label: 'Ben Hughes' }), { zoom: 1.5 });
    await step('…what you talked about…', field('Summary'), null, { zoom: 1.5, typing: { text: 'Planning the Christmas services. Ben would like a day off after Christmas Day.' } });
    await step('…and when the next one is. You’ll be reminded.', field('Next review date'), (l) => l.fill('2026-12-10'), { zoom: 1.6 });
    await step('Save review.', btn('Save review', true), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
    await step('Documents holds contracts, policies and payslips.', await hrLink(/Documents/), (l) => l.click(), { hold: 2.6 });
    await step('Upload one…', btn(/^upload Upload|^Upload/), (l) => l.click(), { zoom: 1.5 });
    await step('…give it a title and a category, and leave Staff blank for a policy everyone can see.', field('Title'), async () => {
      await field('Category').selectOption({ label: 'Policy' }).catch(() => field('Category').selectOption({ index: 1 }));
      await page.locator('input[type="file"]').first().setInputFiles(path.join(__dirname, 'files', 'safeguarding-policy.pdf'));
    }, { zoom: 1.4, typing: { text: 'Safeguarding policy 2026' }, hold: 3 });
    await step('Upload.', page.getByRole('button', { name: 'Upload', exact: true }).last(), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
  });

  await part('Checklists', async () => {
    await step('Checklists make sure nothing’s missed when someone joins or leaves.', await hrLink(/Checklists/), (l) => l.click(), { hold: 3 });
    await step('New template.', btn(/New template/), (l) => l.click(), { zoom: 1.5 });
    await step('Name it, choose joining or leaving…', page.getByPlaceholder('New starter'), null, { zoom: 1.5, typing: { text: 'Leaving the team' } });
    await step('…and list what needs doing.', page.getByPlaceholder('Item 1'), async () => {
      await btn('+ Add item', true).click();
      await page.getByPlaceholder('Item 2').fill('Keys returned');
    }, { zoom: 1.5, typing: { text: 'Exit interview booked' } });
    await step('Save.', page.getByRole('button', { name: 'Save', exact: true }).last(), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
    await go('/admin/hr/staff');
    await step('On someone’s page, start a checklist from a template, then tick things off.', main().getByText('Amara Okafor').first(), (l) => l.click(), { zoom: 1.3, hold: 2.6 });
    await look('Amara’s onboarding: two done, one still to do.', main().getByText('Onboarding', { exact: true }).first(), { zoom: 1.4, hold: 3.4 });
  });

  await part('Jobs and applications', async () => {
    await step('Jobs & internships are the roles on the public jobs page.', await hrLink(/Jobs & internships/), (l) => l.click(), { hold: 2.8 });
    await step('New role.', btn(/New role/), (l) => l.click(), { zoom: 1.5 });
    await step('The title…', page.getByPlaceholder('e.g. Worship Pastor'), null, { zoom: 1.5, typing: { text: 'Sound Technician' } });
    await step('…where, how many hours and the pay…', page.getByPlaceholder('e.g. 37.5 hrs/week'), async () => {
      await page.getByPlaceholder('e.g. Stockton-on-Tees').fill('Destiny Centre, Stockton');
      await page.getByPlaceholder('e.g. £24,000–£28,000').fill('£12.60 an hour');
    }, { zoom: 1.4, typing: { text: 'Sundays, 8am to 1pm' } });
    await step('…a one-line teaser, and the full description below.', page.getByPlaceholder('One-line teaser shown on the listing card.'), null, { zoom: 1.4, typing: { text: 'Run the sound desk for our Sunday services.' }, hold: 2.6 });
    await step('Create role. It stays a draft until you publish it.', btn('Create role', true), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
    await step('Applications are the people who applied through the jobs page.', await hrLink(/Applications/), (l) => l.click(), { hold: 2.8 });
    await step('Open one to read it.', main().getByText('Chloe Martin').first(), (l) => l.click(), { zoom: 1.3, hold: 3 });
    await look('Move each one along as you go: new, reviewing, shortlisted, rejected or hired.', main().getByRole('button', { name: /^Shortlisted/ }).first(), { zoom: 1.4, hold: 3.6 });
  });
});
