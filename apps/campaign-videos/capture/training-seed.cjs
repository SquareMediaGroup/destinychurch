// Starting data for the pretend site the Training Admin tutorial is filmed in
// (capture/training-tutorial.cjs). The training content is made up.
const crypto = require('crypto');

module.exports = () => {
  const welcome = crypto.randomUUID();
  const worship = crypto.randomUUID();
  const hosts = crypto.randomUUID();
  const sound = crypto.randomUUID();
  const basics = crypto.randomUUID();
  return {
    training_categories: [
      { id: welcome, name: 'Welcome Team', slug: 'welcome-team', description: 'Everything for greeters, hosts and the welcome desk.', icon: 'waving_hand', sort_order: 0, is_published: true },
      { id: worship, name: 'Worship & Production', slug: 'worship', description: 'Band, sound, lights and the livestream.', icon: 'music_note', sort_order: 1, is_published: true },
    ],
    training_subgroups: [
      { id: hosts, category_id: welcome, name: 'Hosts', slug: 'hosts', description: 'Welcoming people on a Sunday.', sort_order: 0, is_published: true, password_hash: null },
      { id: sound, category_id: worship, name: 'Sound desk', slug: 'sound', description: 'Running the desk on a Sunday.', sort_order: 0, is_published: true, password_hash: null },
    ],
    training_folders: [{ id: basics, subgroup_id: hosts, name: 'The basics', sort_order: 0 }],
    training_posts: [
      { subgroup_id: hosts, folder_id: basics, title: 'Your first Sunday', slug: 'first-sunday', summary: 'What to expect, and when to arrive.', body: '<p>Arrive by 9:45am and find the team leader at the welcome desk.</p>', sort_order: 0, is_published: true },
      { subgroup_id: hosts, folder_id: basics, title: 'Welcoming someone new', slug: 'welcoming', summary: 'Say hello, then a Connect Card.', body: '<p>Smile, say hello, and offer a Connect Card.</p>', sort_order: 1, is_published: true },
      { subgroup_id: sound, folder_id: null, title: 'Line check', slug: 'line-check', summary: 'Before the band arrives.', body: '<p>Check every channel before 9am.</p>', sort_order: 0, is_published: true },
    ],
    // The tutorial isn't about the onboarding tour, so it has been seen and the checklist hidden.
    admin_onboarding: [{ auth_user_id: 'u-admin', completed_steps: [], gate_seen: true, dismissed: true }],
  };
};

module.exports.defaults = {
  training_categories: () => ({ description: null, icon: null, sort_order: 0, is_published: true }),
  training_subgroups: () => ({ description: null, password_hash: null, sort_order: 0, is_published: true }),
  training_folders: () => ({ sort_order: 0 }),
  training_posts: () => ({ summary: null, body: null, sort_order: 0, is_published: false, folder_id: null }),
};
module.exports.embeds = { training_subgroups: 'category_id', training_posts: 'subgroup_id', training_folders: 'subgroup_id' };
