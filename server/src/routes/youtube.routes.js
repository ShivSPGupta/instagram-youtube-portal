const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("../controllers/youtube.controller");

const router = express.Router();
const publishLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

router.get("/health", controller.health);
router.get("/history", controller.history);
router.get("/auth", controller.auth);
router.get("/callback", controller.callback);
router.post("/publish", publishLimiter, controller.publish);

module.exports = router;
