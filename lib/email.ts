type SuggestionEmail = {
  sermonId: string;
  podcastTitle: string;
  podcastDate: string;
  youtubeTitle: string;
  youtubeDate: string;
  approveLink: string;
};

export async function sendSuggestionEmail(_payload: SuggestionEmail) {
  // TODO: Implement transactional email (Resend/SES/etc.)
  void _payload;
  return;
}

type LoginCodeEmail = {
  email: string;
  code: string;
};

export async function sendLoginCodeEmail(payload: LoginCodeEmail) {
  console.info(`[Auth] Login code for ${payload.email}: ${payload.code}`);
  return;
}