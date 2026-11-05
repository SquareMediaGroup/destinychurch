// Starting data for the pretend site the Design Admin tutorial is filmed in
// (capture/design-tutorial.cjs). The tickets and the people asking are made up.
const crypto = require('crypto');
const date = (d) => new Date(Date.UTC(2026, 10, 5 + d)).toISOString().slice(0, 10);
const at = (d, h = 10) => new Date(Date.UTC(2026, 10, 5 + d, h)).toISOString();
const token = () => crypto.randomBytes(12).toString('hex');

module.exports = () => {
  const ids = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  return {
    design_tickets: [
      { id: ids[0], ref: 142, title: 'Carols by candlelight poster', brief: 'A3 poster and an Instagram square for our carol service on Sunday 20 December at 6pm. Warm, candlelit feel.', category: 'print', needed_by: date(10), specs: 'A3 portrait, plus 1080×1080', requester_name: 'Grace Wilson', requester_email: 'grace.wilson@example.com', requester_verified: true, priority: 'fast_track', status: 'open', revision: 1, share_token: token(), created_at: at(-1) },
      { id: ids[1], ref: 141, title: 'Youth night slides', brief: 'Three welcome slides for Friday youth night, in the Destiny Youth colours.', category: 'social', needed_by: date(5), specs: '1920×1080', requester_name: 'Priya Shah', requester_email: 'priya.shah@example.com', requester_verified: true, priority: 'normal', status: 'in_progress', revision: 1, assignee_email: 'sam.taylor@example.com', assignee_name: 'Sam Taylor', assigned_at: at(-2), share_token: token(), created_at: at(-3) },
      { id: ids[2], ref: 140, title: 'Welcome team lanyards', brief: 'Lanyard cards for the welcome team with the new logo.', category: 'print', needed_by: date(14), specs: 'CR80 card size', requester_name: 'Ben Hughes', requester_email: 'ben.hughes@example.com', requester_verified: true, priority: 'normal', status: 'delivered', revision: 1, assignee_email: 'sam.taylor@example.com', assignee_name: 'Sam Taylor', assigned_at: at(-6), delivered_at: at(-2), share_token: token(), created_at: at(-8) },
      { id: ids[3], ref: 139, title: 'Baptism Sunday banner', brief: 'Website banner for baptism Sunday.', category: 'web', needed_by: date(-3), specs: '2400×800', requester_name: 'Amara Okafor', requester_email: 'amara.okafor@example.com', requester_verified: false, priority: 'normal', status: 'closed', revision: 2, assignee_email: 'sam.taylor@example.com', assignee_name: 'Sam Taylor', assigned_at: at(-15), delivered_at: at(-9), closed_at: at(-8), share_token: token(), created_at: at(-16) },
    ],
    design_ticket_events: [
      { ticket_id: ids[1], kind: 'status', actor_type: 'designer', actor_name: 'Sam Taylor', from_status: 'open', to_status: 'in_progress', created_at: at(-2) },
      { ticket_id: ids[2], kind: 'status', actor_type: 'designer', actor_name: 'Sam Taylor', from_status: 'in_progress', to_status: 'delivered', created_at: at(-2) },
    ],
    design_ticket_deliverables: [
      { ticket_id: ids[2], revision: 1, playbook_asset_token: token(), storage_kind: 'supabase', file_path: 'tickets/140/lanyard.pdf', file_name: 'welcome-lanyard.pdf', mime_type: 'application/pdf', size_bytes: 412000, uploaded_by_email: 'sam.taylor@example.com', created_at: at(-2) },
    ],
    // The tutorial isn't about the onboarding tour, so it has been seen and the checklist hidden.
    admin_onboarding: [{ auth_user_id: 'u-admin', completed_steps: [], gate_seen: true, dismissed: true }],
  };
};

module.exports.defaults = {
  design_tickets: () => ({ specs: null, requester_phone: null, requester_auth_user_id: null, requester_staff_id: null, requester_verified: false, priority: 'normal', status: 'open', revision: 1, assignee_email: null, assignee_name: null, assignee_auth_user_id: null, assigned_at: null, share_token: crypto.randomBytes(12).toString('hex'), playbook_board_token: null, delivered_at: null, closed_at: null, resolution_note: null }),
  design_ticket_events: () => ({ actor_type: 'system', actor_name: null, actor_email: null, from_status: null, to_status: null, body: null, is_internal: false }),
  design_ticket_deliverables: () => ({ revision: 1, playbook_asset_token: crypto.randomBytes(12).toString('hex'), mime_type: null, size_bytes: null, uploaded_by_email: null, storage_kind: 'supabase', file_path: null, link_url: null, link_provider: null, confirmed_at: null, confirmed_by_email: null }),
};
module.exports.embeds = { design_ticket_events: 'ticket_id', design_ticket_deliverables: 'ticket_id' };
