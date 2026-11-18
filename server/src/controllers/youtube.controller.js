const youtubeService = require("../services/youtube.service");

function sendError(res, error) {
  const status = error.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: error.code || "INTERNAL_ERROR",
      message:
        status === 500
          ? "An unexpected server error occurred."
          : error.message,
    },
  });
}

function health(req, res) {
  res.status(200).json({ success: true, data: youtubeService.health() });
}

function history(req, res) {
  res.status(200).json({
    success: true,
    data: { uploads: youtubeService.getUploadHistory() },
  });
}

function auth(req, res) {
  try {
    res.redirect(youtubeService.createAuthorizationUrl());
  } catch (error) {
    sendError(res, error);
  }
}

async function callback(req, res) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  try {
    youtubeService.consumeOAuthState(req.query.state);
    if (typeof req.query.error === "string") {
      console.warn("Google OAuth authorization was rejected:", req.query.error);
      res.redirect(
        `${clientUrl}/youtube?youtube_status=error&youtube_error=${encodeURIComponent(req.query.error)}`,
      );
      return;
    }
    if (typeof req.query.code !== "string" || !req.query.code) {
      throw new Error(
        "Google returned neither an authorization code nor an OAuth error.",
      );
    }
    await youtubeService.exchangeAuthorizationCode(req.query.code);
    res.redirect(`${clientUrl}/youtube?youtube_status=connected`);
  } catch (error) {
    console.error(
      "YouTube OAuth callback failed:",
      error.code || "UNKNOWN",
      error.message,
    );
    res.redirect(
      `${clientUrl}/youtube?youtube_status=error&youtube_error=${encodeURIComponent(error.code || "OAUTH_FAILED")}`,
    );
  }
}

async function publish(req, res) {
  try {
    const results = await youtubeService.publishPosts(req.body?.postIds);
    res.status(200).json({
      success: true,
      data: {
        results,
        succeeded: results.filter((result) => result.success).length,
        failed: results.filter((result) => !result.success).length,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = { health, history, auth, callback, publish };
