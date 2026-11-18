const instagramService = require("../services/instagram.service");

function sendError(res, error) {
  const status = error.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: error.code || "INTERNAL_ERROR",
      message:
        status === 500 ? "An unexpected server error occurred." : error.message,
    },
  });
}

async function health(req, res) {
  res
    .status(200)
    .json({ success: true, data: await instagramService.health() });
}
async function account(req, res) {
  try {
    res.status(200).json({
      success: true,
      data: { profile: await instagramService.getAuthorizedProfile() },
    });
  } catch (error) {
    sendError(res, error);
  }
}
function auth(req, res) {
  try {
    res.redirect(instagramService.createAuthorizationUrl());
  } catch (error) {
    sendError(res, error);
  }
}
async function callback(req, res) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  try {
    instagramService.consumeOAuthState(req.query.state);
    await instagramService.exchangeAuthorizationCode(req.query.code);
    console.log("Instagram OAuth completed successfully");
    res.redirect(`${clientUrl}/instagram?instagram_status=connected`);
  } catch (error) {
    console.error(
      "Instagram OAuth callback failed:",
      error.code || "UNKNOWN",
      error.message,
    );
    res.redirect(
      `${clientUrl}/instagram?instagram_status=error&instagram_error=${encodeURIComponent(error.code || "OAUTH_FAILED")}`,
    );
  }
}
async function profile(req, res) {
  try {
    res.status(200).json({
      success: true,
      data: {
        profile: await instagramService.getProfile(
          req.query.profile || req.body?.profile,
        ),
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}
async function posts(req, res) {
  try {
    res.status(200).json({
      success: true,
      data: await instagramService.listPosts({
        input: req.query.profile,
        after: req.query.after,
        limit: req.query.limit,
      }),
    });
  } catch (error) {
    sendError(res, error);
  }
}

module.exports = { health, account, auth, callback, profile, posts };
