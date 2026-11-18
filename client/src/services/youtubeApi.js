const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

async function parseResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.success)
    throw new Error(body.error?.message || "YouTube request failed.");
  return body.data;
}

export async function fetchYouTubeHealth() {
  return parseResponse(await fetch(`${API_BASE_URL}/youtube/health`));
}

export async function fetchYouTubeHistory() {
  return parseResponse(await fetch(`${API_BASE_URL}/youtube/history`));
}

export async function publishInstagramPosts(postIds) {
  return parseResponse(
    await fetch(`${API_BASE_URL}/youtube/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postIds }),
    }),
  );
}

export function getYouTubeAuthUrl() {
  return `${API_BASE_URL}/youtube/auth`;
}
