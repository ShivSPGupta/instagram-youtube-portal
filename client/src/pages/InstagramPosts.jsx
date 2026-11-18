import {
  AlertCircle,
  Image,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchInstagramAccount,
  fetchInstagramHealth,
  fetchInstagramPosts,
  getInstagramAuthUrl,
} from "../services/instagramApi";
import {
  fetchYouTubeHealth,
  getYouTubeAuthUrl,
  publishInstagramPosts,
} from "../services/youtubeApi";
import PostGallery from "../components/instagram/PostGallery";
import "../components/instagram/instagram.css";

export default function InstagramPosts() {
  const [account, setAccount] = useState(null);
  const [profileInput, setProfileInput] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [after, setAfter] = useState(null);
  const [connection, setConnection] = useState({ configured: false, loading: true });
  const [youtube, setYoutube] = useState({ connected: false, loading: true });
  const [selectedIds, setSelectedIds] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState(null);
  const [publishError, setPublishError] = useState("");
  const abortRef = useRef(null);

  const loadPosts = useCallback(
    async (cursor = null) => {
      if (!profileInput.trim()) {
        setError("Enter an Instagram username or profile URL.");
        return;
      }
      if (!account?.username) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");
      try {
        const data = await fetchInstagramPosts({
          profile: profileInput,
          after: cursor,
          signal: controller.signal,
        });
        setResult((current) =>
          cursor && current
            ? { ...data, profile: account, posts: [...current.posts, ...data.posts] }
            : { ...data, profile: account },
        );
        setAfter(data.nextCursor);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [account, profileInput],
  );

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    async function loadConnectedAccount() {
      try {
        const status = await fetchInstagramHealth();
        if (controller.signal.aborted) return;
        setConnection({ ...status, loading: false });
        if (!status.configured) return;

        const { profile } = await fetchInstagramAccount({
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setAccount(profile);
        setProfileInput(profile.username);
        setLoading(true);
        const data = await fetchInstagramPosts({
          profile: profile.username,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setResult({ ...data, profile });
        setAfter(data.nextCursor);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) {
          setConnection((current) => ({ ...current, loading: false }));
          setLoading(false);
        }
      }
    }

    loadConnectedAccount();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("instagram_status")) {
      window.history.replaceState({}, "", "/instagram");
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchYouTubeHealth()
      .then((status) => {
        if (active) setYoutube({ ...status, loading: false });
      })
      .catch(() => {
        if (active) setYoutube({ connected: false, loading: false });
      });
    return () => {
      active = false;
    };
  }, []);

  function togglePost(postId) {
    setPublishError("");
    if (selectedIds.includes(postId)) {
      setSelectedIds(selectedIds.filter((id) => id !== postId));
      return;
    }
    if (selectedIds.length >= 10) {
      setPublishError("You can select up to 10 posts per publishing batch.");
      return;
    }
    setSelectedIds([...selectedIds, postId]);
  }

  async function publishSelected() {
    setPublishing(true);
    setPublishError("");
    setPublishResults(null);
    try {
      const response = await publishInstagramPosts(selectedIds);
      setPublishResults(response);
      const completed = response.results
        .filter((item) => item.success)
        .map((item) => item.postId);
      setSelectedIds((current) =>
        current.filter((id) => !completed.includes(id)),
      );
    } catch (requestError) {
      setPublishError(requestError.message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="content">
      <div className="page-header">
        <h1>Instagram Posts</h1>
        <p>Browse posts from the Instagram account authorized for this app.</p>
      </div>

      <section
        className={`connection-banner card ${connection.configured ? "connected" : ""}`}
      >
        <span className="connection-dot" />
        <div>
          <strong>
            {connection.loading
              ? "Checking Instagram connection…"
              : connection.configured
                ? `Connected as @${account?.username || "Instagram account"}`
                : "Instagram not connected"}
          </strong>
          <p>
            {connection.configured
              ? "Posts shown below belong to this authorized professional account."
              : "Connect an eligible Business or Creator account through Meta to load its posts."}
          </p>
        </div>
        {!connection.loading && (
          <button
            className="secondary-button"
            onClick={() => {
              window.location.href = getInstagramAuthUrl();
            }}
          >
            {connection.configured ? "Reconnect Instagram" : "Connect Instagram"}
          </button>
        )}
      </section>

      {account && (
        <section className="card instagram-profile">
          <div className="profile-avatar">
            {account.profilePictureUrl ? (
              <img src={account.profilePictureUrl} alt="" />
            ) : (
              <Image size={20} />
            )}
          </div>
          <div>
            <h2>@{account.username}</h2>
            <p>{account.biography || "Instagram professional account"}</p>
          </div>
          <span className="profile-count">
            {account.mediaCount ?? result?.posts.length ?? 0} posts
          </span>
          <button
            className="secondary-button refresh-posts"
            onClick={() => loadPosts()}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle className="spin" size={14} />
            ) : (
              <RefreshCw size={13} />
            )}
            {loading ? "Loading…" : "Refresh"}
          </button>
        </section>
      )}

      {connection.configured && account && (
        <form
          className="card profile-search"
          onSubmit={(event) => {
            event.preventDefault();
            setResult(null);
            setAfter(null);
            loadPosts();
          }}
        >
          <label htmlFor="instagram-profile-input">
            Instagram username or profile URL
          </label>
          <div className="profile-search-row">
            <input
              id="instagram-profile-input"
              value={profileInput}
              onChange={(event) => setProfileInput(event.target.value)}
              placeholder="@username or instagram.com/username"
            />
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? (
                <LoaderCircle className="spin" size={14} />
              ) : (
                <Search size={14} />
              )}
              {loading ? "Fetching…" : "Fetch posts"}
            </button>
          </div>
          <p>
            Meta’s official API only returns posts for professional accounts
            shared with this app. Other public profiles cannot be searched.
          </p>
        </form>
      )}

      {error && (
        <section className="api-error" role="alert">
          <AlertCircle size={17} />
          <div>
            <strong>Couldn’t fetch Instagram posts</strong>
            <p>{error}</p>
          </div>
          {account && (
            <button
              className="secondary-button"
              onClick={() => loadPosts()}
              type="button"
            >
              <RefreshCw size={13} /> Retry
            </button>
          )}
        </section>
      )}

      {result?.posts.length > 0 && (
        <>
          <div className="publish-toolbar">
            <p>
              Select up to 10 posts to publish. Images are converted into
              five-second videos.
            </p>
            {youtube.connected ? (
              <button
                className="primary-button"
                onClick={publishSelected}
                disabled={!selectedIds.length || publishing}
              >
                {publishing ? "Publishing…" : `Publish selected (${selectedIds.length})`}
              </button>
            ) : youtube.configured ? (
              <a className="secondary-button" href={getYouTubeAuthUrl()}>
                Connect YouTube to publish
              </a>
            ) : (
              <button className="secondary-button" disabled>
                Configure Google OAuth to publish
              </button>
            )}
          </div>
          <PostGallery
            posts={result.posts}
            selectedIds={selectedIds}
            onToggle={togglePost}
          />
          {result.hasNextPage && (
            <button
              className="secondary-button load-more"
              onClick={() => loadPosts(after)}
              disabled={loading}
            >
              {loading ? "Loading…" : "Load more posts"}
            </button>
          )}
        </>
      )}

      {publishError && (
        <section className="api-error" role="alert">
          <AlertCircle size={17} />
          <div>
            <strong>Couldn’t publish selected posts</strong>
            <p>{publishError}</p>
          </div>
        </section>
      )}

      {publishResults && (
        <section className="card publish-results" aria-live="polite">
          <strong>
            Published {publishResults.succeeded}; failed {publishResults.failed}
          </strong>
          {publishResults.results.map((item) => (
            <p key={item.postId} className={item.success ? "upload-success" : "upload-failure"}>
              {item.success ? (
                <>
                  Video uploaded.{" "}
                  <a href={item.url} target="_blank" rel="noreferrer">
                    View on YouTube
                  </a>
                </>
              ) : (
                `Post ${item.postId}: ${item.error}`
              )}
            </p>
          ))}
        </section>
      )}

      {connection.loading && (
        <section className="card empty-state">
          <LoaderCircle className="spin" size={22} />
          <p>Loading your connected Instagram account…</p>
        </section>
      )}

      {!connection.loading && !connection.configured && !error && (
        <section className="card empty-state">
          <div>
            <div className="empty-icon">
              <Image size={21} />
            </div>
            <h2>Connect Instagram to view posts</h2>
            <p>
              Meta only provides posts for professional accounts shared with
              this app. Public profile searches aren’t available through this
              integration.
            </p>
          </div>
        </section>
      )}

      {connection.configured &&
        !loading &&
        result?.posts.length === 0 &&
        !error && (
          <section className="card empty-state">
            <div>
              <div className="empty-icon">
                <Image size={21} />
              </div>
              <h2>No posts found</h2>
              <p>
                Meta returned no media for @{account?.username} on this
                authorized account.
              </p>
            </div>
          </section>
        )}
    </div>
  );
}
