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
  status_incidents: () => ({ components: [], started_at: new Date().toISOString(), resolved_at: null, long_outage_alerted_at: null, author_name: null, created_by: null }),
  status_incident_updates: () => ({ author_name: null, created_by: null }),
};
module.exports.embeds = { status_incident_updates: 'incident_id', post_revisions: 'post_id' };
module.exports.serial = ['status_incidents', 'status_incident_updates'];

// supabase/migrations/20260827_engagement_events.sql's engagement_rollup(), with made-up but
// consistent figures: what the Analytics page shows for short links, QR codes and tiles.
const TARGETS = {
  redirect: [['give', '/give', 412], ['connect', '/connect', 268], ['youth', '/youth', 131], ['alpha', '/alpha', 96]],
  nfc: [['connect-card', 'Connect Card', 188], ['give', 'Give', 143], ['kids', 'Kids church', 61], ['wifi', 'Wi-Fi', 57]],
  links: [['sunday', 'Destiny Church: Sunday', 233], ['youth', 'Destiny Youth', 87]],
};
module.exports.rpc = {
  engagement_rollup: ({ p_since, p_source }) => {
    const days = p_since ? Math.max(1, Math.round((Date.now() - Date.parse(p_since)) / 86400000)) : 120;
    const scale = Math.min(days, 120) / 30;
    const sources = p_source ? [p_source] : Object.keys(TARGETS);
    const byTarget = sources.flatMap((s) => (TARGETS[s] ?? []).map(([key, label, n]) => ({ key, label, events: Math.round(n * scale), visitors: Math.round(n * scale * 0.7) })));
    const events = byTarget.reduce((a, b) => a + b.events, 0);
    const visitors = Math.round(events * 0.7);
    const split = (rows) => rows.map(([key, share]) => ({ key, label: null, events: Math.round(events * share), visitors: Math.round(visitors * share) }));
    const n = Math.min(days, 90);
    const timeseries = Array.from({ length: n }, (_, i) => {
      const d = new Date(Date.now() - (n - 1 - i) * 86400000);
      const sunday = d.getUTCDay() === 0;
      const e = Math.round((events / n) * (sunday ? 3.2 : 0.62) * (0.85 + ((i * 37) % 30) / 100));
      return { day: d.toISOString().slice(0, 10), events: e, visitors: Math.round(e * 0.7) };
    });
    return {
      totals: { events, visitors, targets: byTarget.length, bots: Math.round(events * 0.08) },
      timeseries,
      bySource: sources.map((s) => ({ key: s, label: null, events: (TARGETS[s] ?? []).reduce((a, t) => a + Math.round(t[2] * scale), 0), visitors: 0 })),
      byTarget,
      byCountry: split([['GB', 0.94], ['NG', 0.03], ['IE', 0.02], ['US', 0.01]]),
      byReferrer: split([['instagram.com', 0.41], ['(direct)', 0.33], ['facebook.com', 0.17], ['google.com', 0.09]]),
      byDevice: split([['mobile', 0.82], ['desktop', 0.15], ['tablet', 0.03]]),
      byBrowser: split([['Safari', 0.58], ['Chrome', 0.36], ['Samsung Internet', 0.06]]),
      bySrcTag: split([['qr', 0.46], ['ig', 0.31], ['flyer', 0.23]]),
      byIpCategory: split([['residential', 0.71], ['mobile network', 0.29]]),
    };
  },
};
