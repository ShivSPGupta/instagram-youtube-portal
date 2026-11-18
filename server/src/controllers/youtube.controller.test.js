jest.mock("../services/youtube.service", () => ({
  consumeOAuthState: jest.fn(),
  exchangeAuthorizationCode: jest.fn(),
}));

const youtubeService = require("../services/youtube.service");
const controller = require("./youtube.controller");

describe("YouTube OAuth callback", () => {
  const originalClientUrl = process.env.CLIENT_URL;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  beforeEach(() => {
    process.env.CLIENT_URL = "http://localhost:5173";
    console.warn = jest.fn();
    console.error = jest.fn();
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalClientUrl === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = originalClientUrl;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  test("reports Google's access_denied response instead of exchanging a missing code", async () => {
    const response = { redirect: jest.fn() };

    await controller.callback(
      { query: { state: "valid-state", error: "access_denied" } },
      response,
    );

    expect(youtubeService.consumeOAuthState).toHaveBeenCalledWith(
      "valid-state",
    );
    expect(youtubeService.exchangeAuthorizationCode).not.toHaveBeenCalled();
    expect(response.redirect).toHaveBeenCalledWith(
      "http://localhost:5173/youtube?youtube_status=error&youtube_error=access_denied",
    );
  });
});
