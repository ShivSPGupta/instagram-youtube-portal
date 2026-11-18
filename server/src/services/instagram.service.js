const crypto = require("crypto");
const {
  getInstagramConfig,
  getMissingOAuthConfig,
} = require("../config/instagram.config");

const PROFILE_FIELDS =
  "id,username,name,biography,profile_picture_url,media_count";
const MEDIA_FIELDS =
  "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username";
const oauthStates = new Map();
let runtimeCredentials = null;

class InstagramApiError extends Error {
  constructor(message, status = 502, code = "INSTAGRAM_API_ERROR") {
    super(message);
    this.name = "InstagramApiError";
    this.status = status;
    this.code = code;
  }
}

function normalizeProfileInput(value) {
  if (typeof value !== "string" || !value.trim())
    throw new InstagramApiError(
      "Enter an Instagram username or profile URL.",
      400,
      "INVALID_PROFILE_INPUT",
    );
  const input = value.trim();
  let username = input;
  try {
    const parsed = new URL(
      input.startsWith("http") ? input : `https://${input}`,
    );
    if (
      ["instagram.com", "www.instagram.com"].includes(
        parsed.hostname.toLowerCase(),
      )
    )
      username = parsed.pathname.split("/").filter(Boolean)[0] || "";
  } catch {
    username = input;
  }
  username = username.replace(/^@/, "").trim();
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(username))
    throw new InstagramApiError(
      "Enter a valid Instagram username or instagram.com profile URL.",
      400,
      "INVALID_PROFILE_INPUT",
    );
  return username.toLowerCase();
}

function getCredentials() {
  const config = getInstagramConfig();
  return (
    runtimeCredentials || {
      accessToken: config.accessToken,
      instagramUserId: config.instagramUserId,
    }
  );
}

function isAuthorized() {
  const credentials = getCredentials();
  return Boolean(credentials.accessToken && credentials.instagramUserId);
}
function setRuntimeCredentials(credentials) {
  runtimeCredentials = {
    accessToken: credentials.accessToken,
    instagramUserId: String(credentials.instagramUserId),
  };
}
function clearRuntimeCredentials() {
  runtimeCredentials = null;
}

function apiErrorMessage(error) {
  const code = Number(error?.code);
  if (code === 190 || code === 102)
    return "The Instagram access token is invalid or expired. Reconnect the Instagram account.";
  if (code === 200 || code === 10)
    return "Instagram denied access. Confirm the account is a Business or Creator account and the app has instagram_business_basic permission.";
  if (code === 4 || code === 17 || code === 80002 || error?.status === 429)
    return "Instagram rate limit reached. Wait a moment and try again.";
  return (
    error?.message ||
    "Instagram could not complete the request. Try again later."
  );
}

async function requestGraph(path, params = {}) {
  const credentials = getCredentials();
  if (!credentials.accessToken || !credentials.instagramUserId)
    throw new InstagramApiError(
      "Instagram is not authorized. Connect an eligible Instagram professional account first.",
      401,
      "INSTAGRAM_NOT_AUTHORIZED",
    );
  const { apiHost, apiVersion } = getInstagramConfig();
  const url = new URL(`${apiHost}/${apiVersion}/${path.replace(/^\//, "")}`);
  Object.entries({ ...params, access_token: credentials.accessToken }).forEach(
    ([key, value]) => {
      if (value !== undefined && value !== null && value !== "")
        url.searchParams.set(key, value);
    },
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      const graphError = body.error || {};
      throw new InstagramApiError(
        apiErrorMessage({ ...graphError, status: response.status }),
        response.status === 429 ? 429 : 502,
        "INSTAGRAM_API_ERROR",
      );
    }
    return body;
  } catch (error) {
    if (error instanceof InstagramApiError) throw error;
    if (error.name === "AbortError")
      throw new InstagramApiError(
        "Instagram took too long to respond. Try again.",
        504,
        "INSTAGRAM_TIMEOUT",
      );
    throw new InstagramApiError(
      "Instagram is temporarily unavailable. Try again later.",
      502,
      "INSTAGRAM_NETWORK_ERROR",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function toProfile(data) {
  return {
    id: data.id,
    username: data.username,
    name: data.name || null,
    biography: data.biography || null,
    profilePictureUrl: data.profile_picture_url || null,
    mediaCount: data.media_count ?? null,
  };
}
function toPost(item) {
  return {
    id: item.id,
    username: item.username || null,
    caption: item.caption || "",
    mediaType: item.media_type,
    mediaUrl: item.media_url || null,
    thumbnailUrl: item.thumbnail_url || null,
    permalink: item.permalink || null,
    timestamp: item.timestamp || null,
  };
}

async function getAuthorizedProfile() {
  const credentials = getCredentials();
  const profile = await requestGraph(credentials.instagramUserId, {
    fields: PROFILE_FIELDS,
  });
  if (!profile.username)
    throw new InstagramApiError(
      "Meta did not return a username for the connected Instagram account.",
      502,
      "INSTAGRAM_PROFILE_UNAVAILABLE",
    );
  return toProfile(profile);
}

async function getProfile(input) {
  const requestedUsername = normalizeProfileInput(input);
  const profile = await getAuthorizedProfile();
  if (profile.username.toLowerCase() !== requestedUsername)
    throw new InstagramApiError(
      "This profile is not the Instagram account authorized for this app. Meta does not allow arbitrary personal-account lookup through this integration.",
      403,
      "PROFILE_NOT_ACCESSIBLE",
    );
  return profile;
}

async function listPosts({ input, after, limit = 12 } = {}) {
  const profile = await getProfile(input);
  const credentials = getCredentials();
  const data = await requestGraph(`${credentials.instagramUserId}/media`, {
    fields: MEDIA_FIELDS,
    limit: Math.min(Math.max(Number(limit) || 12, 1), 25),
    after,
  });
  return {
    profile,
    posts: (data.data || []).map(toPost),
    nextCursor: data.paging?.cursors?.after || null,
    hasNextPage: Boolean(data.paging?.next),
  };
}

async function getMediaForPublishing(mediaId) {
  if (typeof mediaId !== "string" || !/^\d+$/.test(mediaId))
    throw new InstagramApiError(
      "Select a valid Instagram post.",
      400,
      "INVALID_MEDIA_ID",
    );
  const media = await requestGraph(mediaId, {
    fields: "id,caption,media_type,media_url,permalink,timestamp",
  });
  if (!media.media_url || !["IMAGE", "VIDEO"].includes(media.media_type))
    throw new InstagramApiError(
      "This Instagram post type cannot be published as a YouTube video.",
      400,
      "UNSUPPORTED_INSTAGRAM_MEDIA",
    );
  return toPost(media);
}

function createAuthorizationUrl() {
  const config = getInstagramConfig();
  const missing = getMissingOAuthConfig();
  if (missing.length)
    throw new InstagramApiError(
      `Instagram OAuth is not configured. Missing: ${missing.join(", ")}.`,
      503,
      "INSTAGRAM_OAUTH_NOT_CONFIGURED",
    );
  const state = crypto.randomBytes(32).toString("hex");
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  const url = new URL(config.embedUrl || "https://www.facebook.com/oauth/authorize");
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", config.callbackUrl);
  if (!config.embedUrl) {
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scopes.join(","));
  }
  url.searchParams.set("state", state);
  return url.toString();
}

function consumeOAuthState(state) {
  if (
    typeof state !== "string" ||
    !oauthStates.has(state) ||
    oauthStates.get(state) < Date.now()
  ) {
    if (state) oauthStates.delete(state);
    throw new InstagramApiError(
      "The Instagram OAuth state is invalid or expired. Start authorization again.",
      400,
      "INVALID_OAUTH_STATE",
    );
  }
  oauthStates.delete(state);
  return true;
}

async function exchangeAuthorizationCode(code) {
  const config = getInstagramConfig();
  if (!code || typeof code !== "string")
    throw new InstagramApiError(
      "Instagram did not return a valid authorization code.",
      400,
      "INVALID_AUTHORIZATION_CODE",
    );
  const exchangeUrl = new URL(`${config.apiHost}/${config.apiVersion}/oauth/access_token`);
  exchangeUrl.searchParams.set("client_id", config.appId);
  exchangeUrl.searchParams.set("client_secret", config.appSecret);
  exchangeUrl.searchParams.set("code", code);
  exchangeUrl.searchParams.set("redirect_uri", config.callbackUrl);

  const response = await fetch(exchangeUrl);
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error || !result.access_token) {
    const metaMessage = result.error?.message || result.error_message || result.error_description;
    throw new InstagramApiError(
      `Instagram rejected the authorization code.${metaMessage ? ` Meta response: ${metaMessage}` : " Confirm the redirect URI and Instagram App credentials match Meta."}`,
      502,
      "AUTHORIZATION_CODE_EXCHANGE_FAILED",
    );
  }

  const accountsUrl = new URL(
    `${config.apiHost}/${config.apiVersion}/me/assigned_instagram_accounts`,
  );
  accountsUrl.searchParams.set("access_token", result.access_token);
  accountsUrl.searchParams.set("fields", "id,username,name");
  const accountsResponse = await fetch(accountsUrl);
  const accounts = await accountsResponse.json().catch(() => ({}));
  if (!accountsResponse.ok || accounts.error) {
    const metaMessage = accounts.error?.message;
    throw new InstagramApiError(
      `Instagram authorization succeeded, but assigned accounts could not be retrieved.${metaMessage ? ` Meta response: ${metaMessage}` : ""}`,
      502,
      "ASSIGNED_INSTAGRAM_ACCOUNTS_FAILED",
    );
  }

  const account = Array.isArray(accounts.data) ? accounts.data[0] : null;
  if (!account?.id)
    throw new InstagramApiError(
      "No Instagram account was shared with this app. Add an Instagram professional account to the unified login configuration.",
      403,
      "NO_ASSIGNED_INSTAGRAM_ACCOUNT",
    );

  setRuntimeCredentials({
    accessToken: result.access_token,
    instagramUserId: account.id,
  });
  return { connected: true, userId: String(account.id) };
}

async function health() {
  const missing = getMissingOAuthConfig();
  return {
    configured: isAuthorized(),
    oauthConfigured: missing.length === 0,
    missingOAuthConfig: missing,
    mode: "instagram-unified-login",
  };
}

module.exports = {
  InstagramApiError,
  normalizeProfileInput,
  getAuthorizedProfile,
  getProfile,
  listPosts,
  getMediaForPublishing,
  createAuthorizationUrl,
  consumeOAuthState,
  exchangeAuthorizationCode,
  isAuthorized,
  setRuntimeCredentials,
  clearRuntimeCredentials,
  health,
};
