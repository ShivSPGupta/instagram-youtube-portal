jest.mock("googleapis", () => {
  const OAuth2 = jest.fn();
  return {
    google: {
      auth: { OAuth2 },
      youtube: jest.fn(),
    },
  };
});

const { google } = require("googleapis");
const instagramService = require("./instagram.service");
const service = require("./youtube.service");

describe("YouTube service", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  let mockOAuthClient;
  let mockChannelsList;
  let mockVideosInsert;
  let uploadedBytes;

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client";
    process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
    process.env.GOOGLE_CALLBACK_URL = "http://localhost:5000/api/youtube/callback";
    delete process.env.YOUTUBE_DEFAULT_PRIVACY;

    mockOAuthClient = {
      generateAuthUrl: jest.fn(
        ({ state }) => `https://accounts.google.com/oauth?state=${state}`,
      ),
      getToken: jest.fn().mockResolvedValue({
        tokens: { access_token: "test-access-token" },
      }),
      setCredentials: jest.fn(),
    };
    mockChannelsList = jest.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: "youtube-channel-id",
            snippet: {
              title: "Test channel",
              thumbnails: { default: { url: "https://example.test/avatar.jpg" } },
            },
          },
        ],
      },
    });
    uploadedBytes = null;
    mockVideosInsert = jest.fn(async ({ media }) => {
      const chunks = [];
      for await (const chunk of media.body) chunks.push(chunk);
      uploadedBytes = Buffer.concat(chunks);
      return { data: { id: "youtube-video-id" } };
    });
    google.auth.OAuth2.mockImplementation(() => mockOAuthClient);
    google.youtube.mockReturnValue({
      channels: { list: mockChannelsList },
      videos: { insert: mockVideosInsert },
    });
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test("reports missing Google OAuth configuration without exposing credentials", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    expect(service.health()).toMatchObject({
      configured: false,
      connected: false,
      missingOAuthConfig: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    });
  });

  test("rejects empty or oversized publish batches", async () => {
    await expect(service.publishPosts([])).rejects.toMatchObject({
      code: "INVALID_POST_SELECTION",
      status: 400,
    });
    await expect(
      service.publishPosts(Array.from({ length: 11 }, (_, index) => `${index}`)),
    ).rejects.toMatchObject({
      code: "INVALID_POST_SELECTION",
      status: 400,
    });
  });

  test("converts an authorized Instagram video into a YouTube upload", async () => {
    const authUrl = new URL(service.createAuthorizationUrl());
    service.consumeOAuthState(authUrl.searchParams.get("state"));
    await service.exchangeAuthorizationCode("authorization-code");
    jest.spyOn(instagramService, "getMediaForPublishing").mockResolvedValue({
      id: "123456789",
      mediaType: "VIDEO",
      mediaUrl: "https://scontent.cdninstagram.com/source.mp4",
      caption: "Test caption",
      permalink: "https://www.instagram.com/p/test/",
    });
    global.fetch = jest.fn().mockResolvedValue(
      new Response(Buffer.from("video-content"), {
        headers: { "content-type": "video/mp4" },
      }),
    );

    const result = await service.publishPosts(["123456789"]);

    expect(result[0]).toMatchObject({
      postId: "123456789",
      success: true,
      videoId: "youtube-video-id",
      url: "https://www.youtube.com/watch?v=youtube-video-id",
    });
    expect(uploadedBytes.toString()).toBe("video-content");
    expect(mockVideosInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: {
          snippet: {
            title: "Test caption",
            description:
              "Test caption\n\nOriginal Instagram post: https://www.instagram.com/p/test/",
          },
          status: { privacyStatus: "unlisted" },
        },
      }),
    );
    expect(service.getUploadHistory()[0]).toMatchObject({
      postId: "123456789",
      success: true,
    });
  });
});
