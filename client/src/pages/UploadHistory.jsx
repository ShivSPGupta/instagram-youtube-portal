import { useEffect, useState } from "react";
import { fetchYouTubeHistory } from "../services/youtubeApi";

export default function UploadHistory() {
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchYouTubeHistory()
      .then((data) => setUploads(data.uploads))
      .catch((requestError) => setError(requestError.message));
  }, []);

  return (
    <div className="content">
      <div className="page-header">
        <h1>Upload History</h1>
        <p>Recent results from publishing Instagram posts to YouTube.</p>
      </div>
      {error && <section className="api-error" role="alert">{error}</section>}
      {uploads.length ? (
        <section className="card upload-history">
          {uploads.map((upload, index) => (
            <article className="upload-history-row" key={`${upload.postId}-${upload.createdAt}-${index}`}>
              <div>
                <strong>{upload.title || `Instagram post ${upload.postId}`}</strong>
                <p>
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(upload.createdAt))}
                </p>
              </div>
              {upload.success ? (
                <a href={upload.url} target="_blank" rel="noreferrer">
                  View video
                </a>
              ) : (
                <span className="upload-failure">{upload.error}</span>
              )}
            </article>
          ))}
        </section>
      ) : (
        !error && (
          <section className="card empty-state">
            <div>
              <div className="empty-icon">—</div>
              <h2>No uploads yet</h2>
              <p>Published videos and failed attempts will appear here.</p>
            </div>
          </section>
        )
      )}
    </div>
  );
}
