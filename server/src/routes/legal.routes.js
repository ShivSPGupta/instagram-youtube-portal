const express = require("express");

const router = express.Router();

function page(title, content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | SocialFlow</title><style>body{font-family:Arial,sans-serif;line-height:1.6;max-width:760px;margin:0 auto;padding:40px 20px;color:#172033}h1{color:#4f46e5}h2{margin-top:30px}small{color:#64748b}</style></head><body><h1>${title}</h1>${content}<small>SocialFlow</small></body></html>`;
}

router.get("/privacy-policy", (req, res) => {
  const contact =
    process.env.PRIVACY_CONTACT_EMAIL ||
    "Add PRIVACY_CONTACT_EMAIL to the server environment";
  res
    .type("html")
    .send(
      page(
        "Privacy Policy",
        `<p>Last updated: November 18, 2026</p><p>SocialFlow helps users connect eligible Instagram professional accounts and prepare content for publishing to their connected YouTube channel.</p><h2>Information we process</h2><p>When you authorize an account, we may process your Instagram username, profile information, media identifiers, captions, timestamps, media URLs, and OAuth tokens. We may also process your YouTube channel information and upload status when YouTube is connected.</p><h2>How we use information</h2><p>We use this information only to authenticate connected accounts, display available content, process selected media, publish requested videos, and show upload status. We do not sell personal information.</p><h2>Storage and security</h2><p>OAuth credentials are kept on the server and are not sent to the browser. Credentials and account data should be encrypted and access-controlled in production. Temporary media files are deleted after processing according to the application's retention settings.</p><h2>Sharing</h2><p>We share data only with the platform APIs required to perform an action requested by you, including Meta and Google/YouTube.</p><h2>Data deletion</h2><p>You may request deletion of your account data and connected-platform data by contacting <a href="mailto:${contact}">${contact}</a>. You may also revoke access from your Meta or Google account settings.</p><h2>Contact</h2><p>${contact}</p>`,
      ),
    );
});

router.get("/data-deletion", (req, res) => {
  const contact =
    process.env.PRIVACY_CONTACT_EMAIL ||
    "Add PRIVACY_CONTACT_EMAIL to the server environment";
  res
    .type("html")
    .send(
      page(
        "Data Deletion",
        `<p>To request deletion of data associated with SocialFlow, email <a href="mailto:${contact}">${contact}</a> from the address associated with your account and include “SocialFlow data deletion” in the subject. We will verify the request and delete stored account credentials, profile data, media metadata, and upload records, except where retention is required by law.</p>`,
      ),
    );
});

module.exports = router;
