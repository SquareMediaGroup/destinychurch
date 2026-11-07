// Starting data for the pretend site the HR Admin tutorial is filmed in (capture/hr-tutorial.cjs).
// Every person, job, application and review here is invented.
const crypto = require('crypto');
const date = (d) => new Date(Date.UTC(2026, 10, 5 + d)).toISOString().slice(0, 10);
const at = (d, h = 10) => new Date(Date.UTC(2026, 10, 5 + d, h)).toISOString();

module.exports = () => {
  const ids = Object.fromEntries(['grace', 'ben', 'priya', 'tom', 'amara'].map((k) => [k, crypto.randomUUID()]));
  const job = crypto.randomUUID();
  const onboard = crypto.randomUUID();
  return {
    hr_staff: [
      { id: ids.grace, first_name: 'Grace', last_name: 'Wilson', email: 'grace.wilson@example.com', phone: '07700 900111', job_title: 'Operations Manager', department: 'Operations', employment_type: 'full_time', status: 'active', start_date: '2022-09-01', annual_leave_entitlement: 25 },
      { id: ids.ben, first_name: 'Ben', last_name: 'Hughes', email: 'ben.hughes@example.com', job_title: 'Worship Pastor', department: 'Worship', employment_type: 'full_time', status: 'active', start_date: '2021-01-11', annual_leave_entitlement: 25 },
      { id: ids.priya, first_name: 'Priya', last_name: 'Shah', email: 'priya.shah@example.com', job_title: 'Youth Worker', department: 'Youth', employment_type: 'part_time', status: 'active', start_date: '2024-03-04', annual_leave_entitlement: 15 },
      { id: ids.tom, first_name: 'Tom', last_name: 'Reid', email: 'tom.reid@example.com', job_title: 'Café Supervisor', department: 'Hospitality', employment_type: 'part_time', status: 'on_leave', start_date: '2023-06-12', annual_leave_entitlement: 12 },
      { id: ids.amara, first_name: 'Amara', last_name: 'Okafor', email: 'amara.okafor@example.com', job_title: 'Kids Church Coordinator', department: 'Kids', employment_type: 'volunteer', status: 'active', start_date: '2025-01-05', annual_leave_entitlement: 0 },
    ],
    hr_leave_requests: [
      { staff_id: ids.ben, type: 'holiday', start_date: date(20), end_date: date(24), days: 5, reason: 'Family visit', status: 'pending', created_at: at(-1) },
      { staff_id: ids.priya, type: 'holiday', start_date: date(34), end_date: date(35), days: 2, reason: null, status: 'pending', created_at: at(-2) },
      { staff_id: ids.grace, type: 'holiday', start_date: date(-20), end_date: date(-16), days: 5, reason: 'Half term', status: 'approved', reviewed_by: 'Sam Taylor', reviewed_at: at(-30), created_at: at(-32) },
      { staff_id: ids.tom, type: 'sick', start_date: date(-3), end_date: date(4), days: 6, reason: null, status: 'approved', reviewed_by: 'Sam Taylor', reviewed_at: at(-3), created_at: at(-3) },
    ],
    hr_reviews: [
      { staff_id: ids.grace, review_date: date(-60), type: 'appraisal', reviewer: 'Sam Taylor', summary: 'A strong year: the new rota system has made Sundays much smoother.', next_review_date: date(305) },
      { staff_id: ids.priya, review_date: date(-14), type: 'one_to_one', reviewer: 'Sam Taylor', summary: 'Youth numbers growing. Wants training in safeguarding level 2.', next_review_date: date(16) },
    ],
    hr_documents: [
      { staff_id: ids.grace, title: 'Employment contract', category: 'contract', file_path: 'staff/grace/contract.pdf', file_name: 'contract.pdf', mime_type: 'application/pdf', size_bytes: 182000, uploaded_by: 'Sam Taylor', created_at: at(-400) },
      { staff_id: null, title: 'Staff handbook 2026', category: 'policy', file_path: 'policies/handbook-2026.pdf', file_name: 'handbook-2026.pdf', mime_type: 'application/pdf', size_bytes: 940000, uploaded_by: 'Sam Taylor', created_at: at(-200) },
    ],
    jobs: [
      { id: job, title: 'Children’s Ministry Assistant', slug: 'childrens-ministry-assistant', kind: 'job', department: 'Kids', employment_type: 'part_time', location: 'Destiny Centre, Stockton', hours: '16 hours a week', salary: '£12.60 an hour', summary: 'Help us run Kids Church and our midweek clubs.', description: 'You will plan and lead sessions for our 5 to 11s.', closing_date: date(21), is_published: true, sort_order: 0 },
      { title: 'Media Intern', slug: 'media-intern', kind: 'internship', department: 'Media', employment_type: 'volunteer', location: 'Destiny Centre', hours: 'Flexible', salary: null, summary: 'A year learning livestream, video and design.', description: null, closing_date: date(45), is_published: false, sort_order: 1 },
    ],
    job_applications: [
      { job_id: job, job_title: 'Children’s Ministry Assistant', first_name: 'Chloe', last_name: 'Martin', email: 'chloe.martin@example.com', phone: '07700 900222', cover_letter: 'I have led a holiday club for three summers and would love to do this every week.', cv_path: null, cv_name: null, status: 'new', created_at: at(-2) },
      { job_id: job, job_title: 'Children’s Ministry Assistant', first_name: 'Daniel', last_name: 'Reid', email: 'daniel.reid@example.com', phone: null, cover_letter: 'Teaching assistant for five years, DBS checked.', cv_path: null, cv_name: null, status: 'reviewing', created_at: at(-6) },
    ],
    hr_checklist_templates: [{ id: onboard, name: 'New staff', kind: 'onboarding' }],
    hr_checklist_template_items: [
      { template_id: onboard, label: 'Contract signed', sort_order: 0 },
      { template_id: onboard, label: 'DBS check started', sort_order: 1 },
      { template_id: onboard, label: 'Safeguarding training booked', sort_order: 2 },
      { template_id: onboard, label: 'Keys and building access', sort_order: 3 },
    ],
    hr_checklist_items: [
      { staff_id: ids.amara, kind: 'onboarding', label: 'Contract signed', is_done: true, done_at: at(-300), sort_order: 0 },
      { staff_id: ids.amara, kind: 'onboarding', label: 'DBS check started', is_done: true, done_at: at(-298), sort_order: 1 },
      { staff_id: ids.amara, kind: 'onboarding', label: 'Safeguarding training booked', is_done: false, sort_order: 2 },
    ],
    // The tutorial isn't about the onboarding tour, so it has been seen and the checklist hidden.
    admin_onboarding: [{ auth_user_id: 'u-admin', completed_steps: [], gate_seen: true, dismissed: true }],
  };
};

module.exports.defaults = {
  hr_staff: () => ({ email: null, phone: null, job_title: null, department: null, employment_type: 'full_time', status: 'active', start_date: null, end_date: null, annual_leave_entitlement: 0, notes: null, avatar_url: null, auth_user_id: null }),
  hr_leave_requests: () => ({ type: 'holiday', days: 0, reason: null, status: 'pending', reviewed_by: null, reviewed_at: null }),
  hr_reviews: () => ({ type: 'one_to_one', reviewer: null, summary: null, next_review_date: null, reminder_sent_at: null }),
  hr_documents: () => ({ staff_id: null, category: 'other', mime_type: null, size_bytes: null, uploaded_by: null }),
  jobs: () => ({ kind: 'job', department: null, employment_type: 'full_time', location: null, hours: null, salary: null, summary: null, description: null, closing_date: null, is_published: false, sort_order: 0 }),
  job_applications: () => ({ phone: null, cover_letter: null, cv_path: null, cv_name: null, status: 'new' }),
  hr_checklist_template_items: () => ({ sort_order: 0 }),
  hr_checklist_items: () => ({ is_done: false, done_at: null, due_date: null, sort_order: 0, notes: null }),
};
module.exports.embeds = { hr_checklist_template_items: 'template_id' };
module.exports.toOne = { hr_staff: 'staff_id' };
