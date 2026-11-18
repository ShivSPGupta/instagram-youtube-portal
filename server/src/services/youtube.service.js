const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");
const { google } = require("googleapis");
const ffmpegPath = require("ffmpeg-static");
const {
  getYouTubeConfig,
  getMissingOAuthConfig,
} = require("../config/youtube.config");
const instagramService = require("./instagram.service");

const oauthStates = new Map();
const MAX_MEDIA_BYTES = 256 * 1024 * 1024;
let oauthClient = null;
let connectedChannel = null;
const uploadHistory = [];

class YouTubeApiError extends Error {
  constructor(message, status = 502, code = "YOUTUBE_API_ERROR") {
    super(message);
    this.name = "YouTubeApiError";
    this.status = status;
    this.code = code;
  }
}

function createOAuthClient() {
  const config = getYouTubeConfig();
  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.callbackUrl,
  );
}

function createAuthorizationUrl() {
  const missing = getMissingOAuthConfig();
  if (missing.length)
    throw new YouTubeApiError(
      `YouTube OAuth is not configured. Missing: ${missing.join(", ")}.`,
      503,
      "YOUTUBE_OAUTH_NOT_CONFIGURED",
    );

  const state = crypto.randomBytes(32).toString("hex");
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  return createOAuthClient().generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/youtube.upload",
      "https://www.googleapis.com/auth/youtube.readonly",
    ],
    state,
  });
}

function consumeOAuthState(state) {
  if (
    typeof state !== "string" ||
    !oauthStates.has(state) ||
    oauthStates.get(state) < Date.now()
  ) {
    if (state) oauthStates.delete(state);
    throw new YouTubeApiError(
      "The Google OAuth state is invalid or expired. Start authorization again.",
      400,
      "INVALID_YOUTUBE_OAUTH_STATE",
    );
  }
  oauthStates.delete(state);
}

async function exchangeAuthorizationCode(code) {
  if (!code || typeof code !== "string")
    throw new YouTubeApiError(
      "Google did not return a valid authorization code.",
      400,
      "INVALID_YOUTUBE_AUTHORIZATION_CODE",
    );

  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token)
    throw new YouTubeApiError(
      "Google did not return an access token for YouTube.",
      502,
      "YOUTUBE_TOKEN_EXCHANGE_FAILED",
    );
  client.setCredentials(tokens);

  const youtube = google.youtube({ version: "v3", auth: client });
  const response = await youtube.channels.list({
    part: ["snippet"],
    mine: true,
  });
  const channel = response.data.items?.[0];
  if (!channel?.id)
    throw new YouTubeApiError(
      "No YouTube channel is available for this Google account.",
      403,
      "YOUTUBE_CHANNEL_NOT_FOUND",
    );

  oauthClient = client;
  connectedChannel = {
    id: channel.id,
    title: channel.snippet?.title || "YouTube channel",
    thumbnailUrl: channel.snippet?.thumbnails?.default?.url || null,
  };
  return connectedChannel;
}

function health() {
  return {
    configured: getMissingOAuthConfig().length === 0,
    connected: Boolean(oauthClient && connectedChannel),
    channel: connectedChannel,
    missingOAuthConfig: getMissingOAuthConfig(),
  };
}

function getUploadHistory() {
  return uploadHistory.slice(0, 100);
}

function getAllowedMediaHost(hostname) {
  return (
    /(^|\.)cdninstagram\.com$/i.test(hostname) ||
    /(^|\.)fbcdn\.net$/i.test(hostname)
  );
}

async function downloadInstagramMedia(mediaUrl, directory, mediaType) {
  let url = new URL(mediaUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  let response;
  try {
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      if (url.protocol !== "https:" || !getAllowedMediaHost(url.hostname))
        throw new YouTubeApiError(
          "Instagram returned a media URL on an unsupported host.",
          502,
          "UNSAFE_MEDIA_URL",
        );
      response = await fetch(url, {
        signal: controller.signal,
        redirect: "manual",
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location || redirects === 3)
        throw new YouTubeApiError(
          "Instagram media redirected too many times.",
          502,
          "MEDIA_REDIRECT_LIMIT",
        );
      url = new URL(location, url);
    }

    if (!response.ok || !response.body)
      throw new YouTubeApiError(
        `Could not download Instagram media (HTTP ${response.status}).`,
        502,
        "MEDIA_DOWNLOAD_FAILED",
      );

    const contentType = response.headers.get("content-type")?.split(";")[0];
    const mimeExtensions = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "video/mp4": ".mp4",
      "video/quicktime": ".mov",
    };
    const extension = mimeExtensions[contentType];
    const expectedPrefix = mediaType === "VIDEO" ? "video/" : "image/";
    if (!extension || !contentType.startsWith(expectedPrefix))
      throw new YouTubeApiError(
        "Instagram returned an unsupported media format.",
        415,
        "UNSUPPORTED_MEDIA_FORMAT",
      );

    const filePath = path.join(directory, `source${extension}`);
    let bytes = 0;
    const limit = new Transform({
      transform(chunk, encoding, callback) {
        bytes += chunk.length;
        if (bytes > MAX_MEDIA_BYTES) {
          callback(
            new YouTubeApiError(
              "The Instagram media exceeds the 256 MB upload limit.",
              413,
              "MEDIA_TOO_LARGE",
            ),
          );
          return;
        }
        callback(null, chunk);
      },
    });
    await pipeline(
      require("stream").Readable.fromWeb(response.body),
      limit,
      fs.createWriteStream(filePath),
      { signal: controller.signal },
    );
    return filePath;
  } catch (error) {
    if (error instanceof YouTubeApiError) throw error;
    if (error.name === "AbortError")
      throw new YouTubeApiError(
        "Downloading Instagram media timed out.",
        504,
        "MEDIA_DOWNLOAD_TIMEOUT",
      );
    throw new YouTubeApiError(
      "Instagram media could not be downloaded.",
      502,
      "MEDIA_DOWNLOAD_FAILED",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function convertImageToVideo(imagePath, outputPath) {
  if (!ffmpegPath)
    throw new YouTubeApiError(
      "FFmpeg is unavailable; image posts cannot be converted to YouTube videos.",
      503,
      "FFMPEG_NOT_AVAILABLE",
    );
  return new Promise((resolve, reject) => {
    const process = spawn(
      ffmpegPath,
      [
        "-y",
        "-loop",
        "1",
        "-i",
        imagePath,
        "-t",
        "5",
        "-vf",
        "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-r",
        "30",
        "-c:v",
        "libx264",
        "-movflags",
        "+faststart",
        "-an",
        outputPath,
      ],
      { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    const timer = setTimeout(() => process.kill(), 60_000);
    process.stderr.on("data", (chunk) => {
      if (stderr.length < 4000) stderr += chunk.toString();
    });
    process.on("error", (error) => {
      clearTimeout(timer);
      reject(
        new YouTubeApiError(
          `Could not start FFmpeg: ${error.message}`,
          503,
          "FFMPEG_START_FAILED",
        ),
      );
    });
    process.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else
        reject(
          new YouTubeApiError(
            `Could not convert the Instagram image to video.${stderr ? ` ${stderr.trim().slice(-800)}` : ""}`,
            422,
            "IMAGE_CONVERSION_FAILED",
          ),
        );
    });
  });
}

function getVideoTitle(caption) {
  const firstLine = (caption || "").split(/\r?\n/).find((line) => line.trim());
  return (firstLine || "Instagram post").slice(0, 100);
}

async function publishPost(postId) {
  if (!oauthClient || !connectedChannel)
    throw new YouTubeApiError(
      "Connect a YouTube channel before publishing.",
      401,
      "YOUTUBE_NOT_CONNECTED",
    );

  const post = await instagramService.getMediaForPublishing(postId);
  const directory = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "instagram-youtube-"),
  );
  try {
    const downloadedPath = await downloadInstagramMedia(
      post.mediaUrl,
      directory,
      post.mediaType,
    );
    const uploadPath =
      post.mediaType === "IMAGE"
        ? path.join(directory, "instagram-image.mp4")
        : downloadedPath;
    if (post.mediaType === "IMAGE")
      await convertImageToVideo(downloadedPath, uploadPath);

    const description = [
      post.caption || "",
      post.permalink ? `Original Instagram post: ${post.permalink}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 5000);
    const privacyStatus = getYouTubeConfig().defaultPrivacy;
    if (!["private", "unlisted", "public"].includes(privacyStatus))
      throw new YouTubeApiError(
        "YOUTUBE_DEFAULT_PRIVACY must be private, unlisted, or public.",
        503,
        "INVALID_YOUTUBE_PRIVACY",
      );
    const youtube = google.youtube({ version: "v3", auth: oauthClient });
    const response = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: getVideoTitle(post.caption),
          description,
        },
        status: {
          privacyStatus,
        },
      },
      media: { body: fs.createReadStream(uploadPath) },
    });
    const videoId = response.data.id;
    if (!videoId)
      throw new YouTubeApiError(
        "YouTube did not return an uploaded video ID.",
        502,
        "YOUTUBE_UPLOAD_FAILED",
      );
    return {
      postId,
      success: true,
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title: getVideoTitle(post.caption),
    };
  } finally {
    await fs.promises.rm(directory, { recursive: true, force: true });
  }
}

async function publishPosts(postIds) {
  if (!Array.isArray(postIds) || postIds.length < 1 || postIds.length > 10)
    throw new YouTubeApiError(
      "Select between 1 and 10 posts to publish at a time.",
      400,
      "INVALID_POST_SELECTION",
    );

  const uniqueIds = [...new Set(postIds)];
  const results = [];
  for (const postId of uniqueIds) {
    let result;
    try {
      result = await publishPost(postId);
    } catch (error) {
      result = {
        postId,
        success: false,
        error: error.message,
        code: error.code || "YOUTUBE_UPLOAD_FAILED",
      };
    }
    const recorded = { ...result, createdAt: new Date().toISOString() };
    uploadHistory.unshift(recorded);
    results.push(recorded);
  }
  uploadHistory.length = Math.min(uploadHistory.length, 100);
  return results;
}

module.exports = {
  YouTubeApiError,
  createAuthorizationUrl,
  consumeOAuthState,
  exchangeAuthorizationCode,
  health,
  getUploadHistory,
  publishPosts,
};
