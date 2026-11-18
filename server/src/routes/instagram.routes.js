const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("../controllers/instagram.controller");

const router = express.Router();
const instagramLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message:
        "Too many Instagram requests. Please wait a moment and try again.",
    },
  },
});

router.get("/health", controller.health);
router.get("/account", controller.account);
router.get("/auth", controller.auth);
router.get("/callback", controller.callback);
router.get("/profile", instagramLimiter, controller.profile);
router.post("/profile", instagramLimiter, controller.profile);
router.get("/posts", instagramLimiter, controller.posts);

module.exports = router;
