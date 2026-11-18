import { AlertCircle, ArrowRight, LoaderCircle, PlaySquare } from "lucide-react";
import { useEffect, useState } from "react";
import {
  fetchYouTubeHealth,
  getYouTubeAuthUrl,
} from "../services/youtubeApi";

export default function YouTubeConnect() {
  const [connection, setConnection] = useState({
    configured: false,
    connected: false,
    loading: true,
  });
  const [error, setError] = useState(() => {
    const errorCode = new URLSearchParams(window.location.search).get(
      "youtube_error",
    );
    if (!errorCode) return "";
    if (errorCode === "access_denied")
      return "Google authorization was canceled or denied. Approve access and try connecting again.";
    return `YouTube connection failed (${errorCode}).`;
  });

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    if (params.has("youtube_status")) {
      window.history.replaceState({}, "", "/youtube");
    }

    fetchYouTubeHealth()
      .then((status) => {
        if (active) setConnection({ ...status, loading: false });
      })
      .catch((requestError) => {
        if (active) {
          setConnection({ configured: false, connected: false, loading: false });
          setError(requestError.message);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="content">
      <div className="page-header">
        <h1>YouTube Connection</h1>
        <p>Connect the channel where selected Instagram posts will be published.</p>
      </div>
      <section className="card youtube-hero">
        <div className="youtube-logo">
          <PlaySquare size={28} />
        </div>
        {connection.loading ? (
          <>
            <h2>Checking YouTube connection…</h2>
            <LoaderCircle className="spin" size={20} />
          </>
        ) : connection.connected ? (
          <>
            {connection.channel?.thumbnailUrl && (
              <img
                className="youtube-channel-avatar"
                src={connection.channel.thumbnailUrl}
                alt=""
              />
            )}
            <h2>{connection.channel?.title} is connected</h2>
            <p>
              Selected Instagram photos are converted to five-second videos;
              videos are uploaded as Unlisted by default.
            </p>
            <a className="secondary-button" href={getYouTubeAuthUrl()}>
              Connect a different channel <ArrowRight size={14} />
            </a>
          </>
        ) : (
          <>
            <h2>Your YouTube channel isn’t connected</h2>
            <p>
              Authorize SocialFlow with Google OAuth to upload videos and check
              the connected channel. Uploads are Unlisted by default.
            </p>
            {connection.configured ? (
              <a className="primary-button" href={getYouTubeAuthUrl()}>
                Connect YouTube <ArrowRight size={14} />
              </a>
            ) : (
              <p className="youtube-config-warning">
                Google OAuth is not configured. Set GOOGLE_CLIENT_ID and
                GOOGLE_CLIENT_SECRET on the server.
              </p>
            )}
          </>
        )}
        {error && (
          <p className="youtube-connect-error" role="alert">
            <AlertCircle size={15} /> {error}
          </p>
        )}
      </section>
    </div>
  );
}
