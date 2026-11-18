import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchYouTubeHistory } from "../../services/youtubeApi";

export default function RecentUploads() {
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchYouTubeHistory()
      .then((data) => setUploads(data.uploads.slice(0, 3)))
      .catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <section className="card section-card">
      <div className="section-heading">
        <h2>Recent uploads</h2>
        <a className="muted-link" href="/history">
          View all <ArrowUpRight size={12} />
        </a>
      </div>
      {error ? (
        <div className="recent-upload-empty" role="alert">
          Couldn’t load upload history: {error}
        </div>
      ) : uploads.length ? (
        <div className="recent-upload-list">
          {uploads.map((upload, index) => (
            <div className="recent-upload-row" key={`${upload.postId}-${upload.createdAt}-${index}`}>
              <span>{upload.title || `Instagram post ${upload.postId}`}</span>
              {upload.success ? (
                <a href={upload.url} target="_blank" rel="noreferrer">
                  View video
                </a>
              ) : (
                <span className="upload-failure">Failed</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="recent-upload-empty">
          No uploads yet. Select Instagram posts to publish them to YouTube.
        </div>
      )}
    </section>
  );
}
