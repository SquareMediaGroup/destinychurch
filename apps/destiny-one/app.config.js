// Dynamic layer over app.json. Everything static stays in app.json; this file
// only adds what can't be committed to a public repo.
//
// Android push: Expo's push service delivers to Android through Firebase Cloud
// Messaging, which needs the Firebase project's google-services.json in the
// build. On EAS it comes from the GOOGLE_SERVICES_JSON file variable; locally,
// from an untracked ./google-services.json. Without either, the build still
// works, but Android phones can't get a push token (see README, "Android push").
const { existsSync } = require("fs");

function googleServicesFile() {
  if (process.env.GOOGLE_SERVICES_JSON) return process.env.GOOGLE_SERVICES_JSON;
  if (existsSync("./google-services.json")) return "./google-services.json";
  return undefined;
}

/** @param {import("expo/config").ConfigContext} ctx @returns {import("expo/config").ExpoConfig} */
module.exports = ({ config }) => {
  const file = googleServicesFile();
  return { ...config, android: { ...config.android, ...(file ? { googleServicesFile: file } : {}) } };
};
