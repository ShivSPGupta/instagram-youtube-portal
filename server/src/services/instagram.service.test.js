const service = require("./instagram.service");

describe("Instagram service", () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.META_ACCESS_TOKEN = "test-token";
    process.env.META_INSTAGRAM_USER_ID = "17841400000000000";
    process.env.META_GRAPH_API_VERSION = "v27.0";
    process.env.META_APP_ID = "test-app";
    process.env.META_APP_SECRET = "test-secret";
    process.env.META_INSTAGRAM_APP_ID = "instagram-test-app";
    process.env.META_INSTAGRAM_APP_SECRET = "instagram-test-secret";
    process.env.META_CALLBACK_URL = "http://localhost:5000/api/instagram/callback";
  });

  afterEach(() => { global.fetch = originalFetch; process.env = { ...originalEnv }; service.clearRuntimeCredentials(); });

  test("normalizes usernames and Instagram profile URLs", () => {
    expect(service.normalizeProfileInput("@Urban_Frames")).toBe("urban_frames");
    expect(service.normalizeProfileInput("https://www.instagram.com/Urban_Frames/")).toBe("urban_frames");
  });

  test("rejects invalid profile input", () => {
    expect(() => service.normalizeProfileInput("not a valid profile!")).toThrow("valid Instagram username");
  });

  test("maps profile and paginated media into a safe response", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "17841400000000000", username: "urban_frames", biography: "City life", media_count: 1 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: "1", media_type: "IMAGE", media_url: "https://cdn.example/image.jpg", caption: "Hello", timestamp: "2026-01-01T00:00:00+0000" }], paging: { cursors: { after: "cursor-2" }, next: "https://graph.instagram.com/next?access_token=secret" } }) });

    const result = await service.listPosts({ input: "urban_frames", limit: 12 });
    expect(result.profile.username).toBe("urban_frames");
    expect(result.posts).toHaveLength(1);
    expect(result.nextCursor).toBe("cursor-2");
    expect(result.hasNextPage).toBe(true);
    expect(JSON.stringify(result)).not.toContain("test-token");
  });

  test("returns a clear error when the requested account is not authorized", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "17841400000000000", username: "different_account" }) });
    await expect(service.getProfile("some_account")).rejects.toMatchObject({ code: "PROFILE_NOT_ACCESSIBLE", status: 403 });
  });

  test("returns the authorized profile without requiring a username search", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "17841400000000000",
        username: "urban_frames",
        biography: "City life",
      }),
    });

    await expect(service.getAuthorizedProfile()).resolves.toMatchObject({
      id: "17841400000000000",
      username: "urban_frames",
      biography: "City life",
    });
  });

  test("retrieves a selected post from the authorized Meta API account", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "123456789",
        media_type: "VIDEO",
        media_url: "https://scontent.cdninstagram.com/video.mp4",
        caption: "A video",
      }),
    });

    await expect(service.getMediaForPublishing("123456789")).resolves.toMatchObject({
      id: "123456789",
      mediaType: "VIDEO",
      caption: "A video",
    });
  });

  test("rejects malformed selected post IDs before making an API request", async () => {
    global.fetch = jest.fn();
    await expect(service.getMediaForPublishing("not-an-id")).rejects.toMatchObject({
      code: "INVALID_MEDIA_ID",
      status: 400,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("rejects an invalid OAuth authorization code", async () => {
    await expect(service.exchangeAuthorizationCode("")).rejects.toMatchObject({ code: "INVALID_AUTHORIZATION_CODE", status: 400 });
  });

  test("uses META_CALLBACK_URL for configured Unified Login and state", () => {
    process.env.META_INSTAGRAM_EMBED_URL =
      "https://www.facebook.com/dialog/oauth?client_id=instagram-test-app&config_id=1175741451646425&redirect_uri=https%3A%2F%2Fold.example%2Fcallback&response_type=code";

    const url = new URL(service.createAuthorizationUrl());

    expect(url.searchParams.get("redirect_uri")).toBe(process.env.META_CALLBACK_URL);
    expect(url.searchParams.get("client_id")).toBe("test-app");
    expect(url.searchParams.get("state")).not.toBe("%3CSTATE%3E");
  });

  test("reports missing OAuth configuration without exposing secrets", async () => {
    delete process.env.META_APP_SECRET;
    delete process.env.META_INSTAGRAM_APP_SECRET;
    const result = await service.health();
    expect(result.oauthConfigured).toBe(false);
    expect(result.missingOAuthConfig).toEqual(["META_APP_SECRET"]);
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });

  test("requires an access token before profile retrieval", async () => {
    delete process.env.META_ACCESS_TOKEN;
    await expect(service.getProfile("urban_frames")).rejects.toMatchObject({ code: "INSTAGRAM_NOT_AUTHORIZED", status: 401 });
  });

  test("maps Meta API errors to a safe message", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, json: async () => ({ error: { code: 190, message: "token details" } }) });
    await expect(service.getProfile("urban_frames")).rejects.toMatchObject({ code: "INSTAGRAM_API_ERROR", message: expect.stringContaining("invalid or expired") });
  });

  test("exchanges a valid code without returning access tokens", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "unified-token" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ id: "17841400000000001", username: "urban_frames" }] }) });
    const result = await service.exchangeAuthorizationCode("valid-code");
    expect(result).toEqual({ connected: true, userId: "17841400000000001" });
    expect(JSON.stringify(result)).not.toContain("token");
    const exchangeUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(exchangeUrl.searchParams.get("code")).toBe("valid-code");
    expect(exchangeUrl.searchParams.get("redirect_uri")).toBe(process.env.META_CALLBACK_URL);
  });
});
