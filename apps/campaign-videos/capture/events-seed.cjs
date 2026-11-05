// Starting data for the pretend site the Event Admin tutorial is filmed in (capture/events-tutorial.cjs).
// Course dates, tiles, links pages, song requests and talent show acts are all made up; the people
// and emails are invented.
const crypto = require('crypto');
const files = [];
const day = (d, h = 19) => new Date(Date.UTC(2026, 10, 5 + d, h, 0)).toISOString();
const date = (d) => day(d).slice(0, 10);

module.exports = ({ base }) => {
  files.length = 0;
  const pageId = crypto.randomUUID();
  const formBlock = crypto.randomUUID();
  return {
    alpha_events: [
      { type: 'alpha', start_date: date(13), signup_url: 'https://destinychurch.churchsuite.com/events/alpha-jan', location: 'Destiny Centre', active: true },
      { type: 'alpha', start_date: date(69), signup_url: 'https://destinychurch.churchsuite.com/events/alpha-mar', location: 'Destiny Centre', active: true },
      { type: 'youth_alpha', start_date: date(20), signup_url: 'https://destinychurch.churchsuite.com/events/youth-alpha', location: 'Youth Hall', active: true },
      { type: 'recovery', start_date: date(6), signup_url: 'https://destinychurch.churchsuite.com/events/destiny-12-2', location: 'Room 2', active: true },
      { type: 'bible_course', start_date: date(27), signup_url: 'https://destinychurch.churchsuite.com/events/bible-course', location: 'Destiny Centre', active: true },
      { type: 'cap', start_date: date(34), signup_url: 'https://destinychurch.churchsuite.com/events/cap-money', location: 'Room 1', active: true },
    ],
    site_banner: [
      { type: 'alpha', active: true, message: '', link: '/alpha', link_text: 'Sign up', description: null },
    ],
    featured_course: [{ id: 1, course_id: 'alpha' }],
    featured_event: [{ id: 1, active: false, popup_active: false }],
    site_popup: [{ active: false, title: null, body: null, cta_text: null, cta_link: null, image_url: null, image_path: null, show_once: true }],
    nfc_tiles: [
      { sort_order: 0, title: 'Connect Card', subtitle: 'New here? Say hello', icon: 'waving_hand', mode: 'embed', embed_url: 'https://destinychurch.churchsuite.com/forms/connect', embed_size: 'lg', active: true },
      { sort_order: 1, title: 'Give', subtitle: 'Give online, securely', icon: 'volunteer_activism', mode: 'info', body: 'Thank you for giving. You can give online any time.', cta_text: 'Give now', cta_link: '/give', active: true },
      { sort_order: 2, title: 'Wi-Fi', subtitle: 'Get online', icon: 'wifi', mode: 'info', body: 'Network: Destiny Guest. Ask at the welcome desk for the password.', active: true },
    ],
    link_pages: [
      { id: pageId, slug: 'sunday', title: 'Destiny Church', bio: 'Everything for this Sunday, in one place.', theme: {}, socials: [], socials_position: 'top', published: true },
    ],
    link_blocks: [
      { page_id: pageId, sort_order: 0, type: 'link', active: true, data: { title: 'Watch live', subtitle: 'Sundays at 10:30am', url: 'https://www.youtube.com/@destinychurch', style: 'featured' } },
      { page_id: pageId, sort_order: 1, type: 'link', active: true, data: { title: 'Fill in a Connect Card', subtitle: 'New here? We’d love to say hello', url: '/connect' } },
      { id: formBlock, page_id: pageId, sort_order: 2, type: 'form', active: true, data: { title: 'Prayer request', description: 'Our prayer team will pray for you this week.', fields: [{ id: 'name', kind: 'name', label: 'Your name', required: true }, { id: 'email', kind: 'email', label: 'Email', required: false }, { id: 'request', kind: 'textarea', label: 'How can we pray?', required: true }], submitLabel: 'Send', successMessage: 'Thank you. We’ll be praying.', notifyEmail: '', display: 'inline' } },
    ],
    link_form_submissions: [
      { page_id: pageId, block_id: formBlock, block_label: 'Prayer request', email: 'jordan.ellis@example.com', data: [{ label: 'Your name', value: 'Jordan Ellis' }, { label: 'How can we pray?', value: 'For my mum’s operation on Tuesday.' }], created_at: day(-1, 12) },
    ],
    song_request_settings: [{ id: 1, open: false, event_name: 'Youth night', max_queue: 25, per_device_limit: 3 }],
    song_requests: [
      { spotify_track_id: 'demo1', title: 'Gratitude', artist: 'Brandon Lake', status: 'queued', device_hash: 'd1', ip_hash: 'i1', created_at: day(-1, 19) },
      { spotify_track_id: 'demo2', title: 'Praise', artist: 'Elevation Worship', status: 'queued', device_hash: 'd2', ip_hash: 'i2', created_at: day(-1, 19) },
      { spotify_track_id: 'demo3', title: 'Firm Foundation (He Won’t)', artist: 'Maverick City Music', status: 'played', device_hash: 'd3', ip_hash: 'i3', created_at: day(-1, 18) },
    ],
    talent_show_settings: [{ id: 1, show_name: 'Destiny’s Got Talent', voting_open: false, results_revealed: false, round: 1 }],
    talent_show_acts: [
      { name: 'The Okafor Sisters', performers: 'Amara & Chioma Okafor', description: 'An acoustic cover, two voices and a guitar.', sort_order: 0, hidden: false, judge_xs: 0 },
      { name: 'Ben on Keys', performers: 'Ben Hughes', description: 'A medley of worship classics on the piano.', sort_order: 1, hidden: false, judge_xs: 0 },
    ],
    // The tutorial isn't about the onboarding tour, so it has been seen and the checklist hidden.
    admin_onboarding: [{ auth_user_id: 'u-admin', completed_steps: [], gate_seen: true, dismissed: true }],
  };
};

module.exports.defaults = {
  alpha_events: () => ({ location: null, active: true }),
  site_banner: () => ({ active: false, message: null, description: null, link: null, link_text: null }),
  nfc_tiles: () => ({ active: true, sort_order: 0, subtitle: null, icon: 'star', mode: 'info', embed_url: null, embed_size: 'md', body: null, image_url: null, image_path: null, cta_text: null, cta_link: null }),
  link_pages: () => ({ title: '', bio: '', avatar_url: null, theme: {}, socials: [], socials_position: 'top', seo_title: null, seo_description: null, og_image_url: null, noindex: false, published: true }),
  link_blocks: () => ({ sort_order: 0, active: true, data: {}, starts_at: null, ends_at: null }),
  talent_show_acts: () => ({ performers: '', description: '', sort_order: 0, hidden: false, judge_xs: 0 }),
  song_requests: () => ({ status: 'queued', artwork_url: null }),
};
module.exports.embeds = { link_blocks: 'page_id' };
module.exports.rpc = {
  // supabase/migrations/20260922_01_link_pages.sql: the page and its whole block stack, saved together.
  link_page_save: ({ p_page_id, p_page, p_blocks }, { table, row, now }) => {
    const pages = table('link_pages');
    const page = pages.find((p) => p.id === p_page_id);
    if (!page) throw new Error(`link page ${p_page_id} not found`);
    Object.assign(page, p_page, { updated_at: now() });
    const keep = new Set(p_blocks.filter((b) => b.id).map((b) => b.id));
    const blocks = table('link_blocks');
    for (let i = blocks.length - 1; i >= 0; i--) if (blocks[i].page_id === p_page_id && !keep.has(blocks[i].id)) blocks.splice(i, 1);
    p_blocks.forEach((b, i) => {
      const existing = b.id && blocks.find((x) => x.id === b.id);
      const values = { page_id: p_page_id, sort_order: i, active: b.active ?? true, type: b.type, data: b.data ?? {}, starts_at: b.starts_at || null, ends_at: b.ends_at || null };
      if (existing) Object.assign(existing, values, { updated_at: now() });
      else blocks.push(row('link_blocks', { ...values, ...(b.id ? { id: b.id } : {}) }));
    });
    return null;
  },
};
Object.defineProperty(module.exports, 'files', { get: () => files });
