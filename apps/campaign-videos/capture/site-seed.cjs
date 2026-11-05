// Starting data for the pretend site the Site Admin tutorial is filmed in (capture/site-tutorial.cjs).
// Pages, redirects and status incidents are made up; the people named are invented.
const day = (d, h = 10) => new Date(Date.UTC(2026, 10, 5 + d, h, 0)).toISOString();

module.exports = () => ({
  posts: [
    {
      title: 'Christmas at Destiny',
      slug: 'christmas',
      subtitle: 'Carols, candles and a warm welcome',
      description: 'Our Christmas services and events, all in one place.',
      body: '<h2>Carols by candlelight</h2><p>Sunday 20 December at 6pm. Bring the whole family: mince pies afterwards.</p><h2>Christmas Day</h2><p>One short service at 10am, then go and enjoy your lunch.</p>',
      is_published: true,
      tags: ['christmas', 'events'],
      updated_by: 'Grace Wilson',
      created_at: day(-12),
      updated_at: day(-2),
    },
    {
      title: 'Baptism Sunday',
      slug: 'baptism',
      subtitle: 'Take the next step',
      description: 'Thinking about being baptised? Here is how it works.',
      body: '<p>Our next baptism Sunday is in the new year. Come to a short class first to ask anything you like.</p>',
      is_published: false,
      tags: ['baptism'],
      updated_by: 'Sam Taylor',
      created_at: day(-4),
      updated_at: day(-1),
    },
    {
      title: 'Summer Holiday Club 2026',
      slug: 'holiday-club',
      subtitle: 'Five days of games, songs and stories',
      description: null,
      body: '<p>Thank you to everyone who came. See you next summer!</p>',
      is_published: true,
      tags: ['kids'],
      updated_by: 'Grace Wilson',
      created_at: day(-120),
      updated_at: day(-90),
    },
  ],
  redirects: [
    { slug: 'give', target_url: 'https://destinychurch.churchsuite.com/donate', label: 'Giving page', active: true, created_at: day(-200) },
    { slug: 'connect', target_url: 'https://destinychurch.churchsuite.com/forms/connect', label: 'Connect Card', active: true, created_at: day(-180) },
    { slug: 'youth', target_url: '/youth', label: 'Youth', active: true, created_at: day(-60) },
    { slug: 'holidayclub', target_url: '/holiday-club', label: 'Holiday Club (summer)', active: false, created_at: day(-150) },
  ],
  status_incidents: [
    { id: 1, title: 'Giving page loading slowly', kind: 'degraded', components: ['giving'], started_at: day(-9, 9), resolved_at: day(-9, 11), author_name: 'Sam Taylor', created_at: day(-9, 9) },
  ],
  status_incident_updates: [
    { id: 1, incident_id: 1, body: 'The giving page is slow to load. We are looking into it.', author_name: 'Sam Taylor', created_at: day(-9, 9) },
    { id: 2, incident_id: 1, body: 'Fixed: our payment provider had a short outage. Giving is back to normal.', author_name: 'Sam Taylor', created_at: day(-9, 11) },
  ],
  // The tutorial isn't about the onboarding tour, so it has been seen and the checklist hidden.
  admin_onboarding: [{ auth_user_id: 'u-admin', completed_steps: [], gate_seen: true, dismissed: true }],
});

module.exports.defaults = {
  posts: () => ({ body: null, is_published: false, hero_style: 'plain', hero_image_url: null, subtitle: null, description: null, og_image_url: null, show_rails: true, draft: null, publish_from: null, publish_until: null, hide_from_search: false, tags: [], deleted_at: null, updated_by: null, review_link_version: 0, review_requested_at: null, review_requested_by: null }),
  redirects: () => ({ label: null, active: true }),
  status_incidents: () => ({ components: [], resolved_at: null, long_outage_alerted_at: null, author_name: null, created_by: null }),
  status_incident_updates: () => ({ author_name: null, created_by: null }),
};
module.exports.embeds = { status_incident_updates: 'incident_id', post_revisions: 'post_id' };
module.exports.serial = ['status_incidents', 'status_incident_updates'];
