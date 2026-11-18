function getInstagramConfig() {
  return {
    appId: process.env.META_APP_ID || process.env.META_INSTAGRAM_APP_ID || "",
    appSecret: process.env.META_APP_SECRET || process.env.META_INSTAGRAM_APP_SECRET || "",
    callbackUrl: process.env.META_CALLBACK_URL || "",
    embedUrl: process.env.META_INSTAGRAM_EMBED_URL || "",
    apiVersion: process.env.META_API_VERSION || process.env.META_GRAPH_API_VERSION || "v27.0",
    apiHost: (process.env.META_INSTAGRAM_API_HOST || "https://graph.facebook.com").replace(/\/$/, ""),
    accessToken: process.env.META_ACCESS_TOKEN || "",
    instagramUserId: process.env.META_INSTAGRAM_USER_ID || "",
    scopes: (process.env.META_INSTAGRAM_SCOPES || "instagram_business_basic").split(",").map((scope) => scope.trim()).filter(Boolean),
  };
}

function getMissingOAuthConfig() {
  const config = getInstagramConfig();
  return [["appId", "META_APP_ID"], ["appSecret", "META_APP_SECRET"], ["callbackUrl", "META_CALLBACK_URL"]].filter(([key]) => !config[key]).map(([, envName]) => envName);
}

function isInstagramConfigured() {
  const config = getInstagramConfig();
  return Boolean(config.accessToken && config.instagramUserId);
}

module.exports = { getInstagramConfig, getMissingOAuthConfig, isInstagramConfigured };
