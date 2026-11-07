// Starting data for the pretend site the Sermon Admin tutorial is filmed in
// (capture/sermons-tutorial.cjs). Sermons and podcast episodes come from the church's public YouTube
// and podcast feeds, read-only; nothing here is published anywhere.
module.exports = () => ({
  sermon_series: [],
  speaker_overrides: [],
  // The tutorial isn't about the onboarding tour, so it has been seen and the checklist hidden.
  admin_onboarding: [{ auth_user_id: 'u-admin', completed_steps: [], gate_seen: true, dismissed: true }],
});
