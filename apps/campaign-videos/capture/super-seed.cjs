// Starting data for the pretend site the Super Admin tutorial is filmed in
// (capture/super-tutorial.cjs): other admins, some audit history and the sitewide banner. Every
// person here is invented.
const crypto = require('crypto');
const at = (d, h = 10, m = 0) => new Date(Date.UTC(2026, 10, 5 + d, h, m)).toISOString();
const none = { training_admin: false, event_admin: false, store_admin: false, site_admin: false, hr_admin: false, design_admin: false, sermon_admin: false, safeguarding_admin: false, destiny_one_admin: false, super_admin: false };

module.exports = () => {
  const grace = crypto.randomUUID();
  const ben = crypto.randomUUID();
  const priya = crypto.randomUUID();
  return {
    admin_roles: [
      { auth_user_id: grace, email: 'grace.wilson@example.com', name: 'Grace Wilson', ...none, event_admin: true, site_admin: true, created_at: at(-300) },
      { auth_user_id: ben, email: 'ben.hughes@example.com', name: 'Ben Hughes', ...none, sermon_admin: true, created_at: at(-200) },
      { auth_user_id: priya, email: 'priya.shah@example.com', name: 'Priya Shah', ...none, destiny_one_admin: true, safeguarding_admin: true, created_at: at(-90) },
    ],
    audit_log: [
      { actor_id: grace, actor_email: 'grace.wilson@example.com', actor_roles: ['event_admin', 'site_admin'], action: 'update', section: 'announcements', entity: 'popup', entity_label: 'Site popup', summary: 'Turned the site popup on: “Christmas at Destiny”', method: 'PUT', path: '/api/admin/popup', created_at: at(0, 9, 12) },
      { actor_id: ben, actor_email: 'ben.hughes@example.com', actor_roles: ['sermon_admin'], action: 'create', section: 'sermons', entity: 'episode', entity_label: 'Know Your Bible', summary: 'Published “Know Your Bible” to the podcast', method: 'POST', path: '/api/admin/sermons/upload', created_at: at(-1, 14, 3) },
      { actor_id: grace, actor_email: 'grace.wilson@example.com', actor_roles: ['event_admin', 'site_admin'], action: 'create', section: 'site', entity: 'redirect', entity_label: '/carols', summary: 'Added the redirect /carols → /christmas', method: 'POST', path: '/api/admin/redirects', created_at: at(-1, 11, 40) },
      { actor_id: priya, actor_email: 'priya.shah@example.com', actor_roles: ['destiny_one_admin', 'safeguarding_admin'], action: 'approve', section: 'destiny-one', entity: 'member', entity_label: 'Jordan Ellis', summary: 'Approved Jordan Ellis’s request to join Destiny One', method: 'POST', path: '/api/admin/destiny-one/members/approve', created_at: at(-2, 19, 22) },
      { actor_id: null, actor_email: 'sam.taylor@example.com', actor_roles: ['super_admin'], action: 'update', section: 'users', entity: 'admin', entity_label: 'ben.hughes@example.com', summary: 'Gave ben.hughes@example.com Sermon Admin', method: 'PATCH', path: '/api/admin/users', created_at: at(-3, 10, 5) },
    ],
    site_banner: [{ type: 'announcement', active: false, message: 'Join us this Sunday at 10:30am', description: null, link: '/visit', link_text: 'Plan a visit' }],
  };
};

module.exports.defaults = {
  audit_log: () => ({ actor_roles: [], entity_id: null, entity_label: null, changes: null, metadata: null, method: null, path: null, ip: null, user_agent: null }),
  site_banner: () => ({ active: false, message: null, description: null, link: null, link_text: null, starts_at: null, ends_at: null }),
};
module.exports.serial = ['audit_log'];
