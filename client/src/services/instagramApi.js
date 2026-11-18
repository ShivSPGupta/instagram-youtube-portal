const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
async function parseResponse(response) { const body = await response.json().catch(() => ({})); if (!response.ok || !body.success) throw new Error(body.error?.message || "Instagram request failed."); return body.data; }
export async function fetchInstagramPosts({ profile, after, limit = 12, signal }) { const params = new URLSearchParams({ profile, limit: String(limit) }); if (after) params.set("after", after); const response = await fetch(`${API_BASE_URL}/instagram/posts?${params}`, { signal }); return parseResponse(response); }
export async function fetchInstagramHealth() { const response = await fetch(`${API_BASE_URL}/instagram/health`); return parseResponse(response); }
export async function fetchInstagramAccount({ signal } = {}) { const response = await fetch(`${API_BASE_URL}/instagram/account`, { signal }); return parseResponse(response); }
export function getInstagramAuthUrl() { return `${API_BASE_URL}/instagram/auth`; }
