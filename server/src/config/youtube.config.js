function getYouTubeConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:5000/api/youtube/callback",
    clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
    defaultPrivacy: process.env.YOUTUBE_DEFAULT_PRIVACY || "unlisted",
  };
}

function getMissingOAuthConfig() {
  const config = getYouTubeConfig();
  return [
    ["clientId", "GOOGLE_CLIENT_ID"],
    ["clientSecret", "GOOGLE_CLIENT_SECRET"],
  ]
    .filter(([key]) => !config[key])
    .map(([, envName]) => envName);
}

module.exports = { getYouTubeConfig, getMissingOAuthConfig };
