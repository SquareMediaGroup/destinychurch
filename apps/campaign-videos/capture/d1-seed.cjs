// Starting data for the pretend site the Destiny One Admin tutorial is filmed in
// (capture/d1-tutorial.cjs). The Destiny One data itself is answered in the browser, by
// capture/d1-fake-api.cjs; this only hides the admin onboarding tour, which the tutorial isn't about.
module.exports = () => ({
  admin_onboarding: [{ auth_user_id: 'u-admin', completed_steps: [], gate_seen: true, dismissed: true }],
});
