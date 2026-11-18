export default function RecentActivity({ uploads = [] }) {
  const recentUploads = uploads.slice(0, 4);

  return (
    <section className="card section-card">
      <div className="section-heading">
        <h2>Recent activity</h2>
        <span className="muted-link">Recent uploads</span>
      </div>
      {recentUploads.length ? (
        <div className="activity-list">
          {recentUploads.map((upload, index) => (
            <div
              className="activity-row"
              key={`${upload.postId}-${upload.createdAt}-${index}`}
            >
              <span className={`activity-dot ${upload.success ? "" : "failed"}`} />
              <div>
                <strong>
                  {upload.success ? "Video published" : "Video upload failed"}
                </strong>
                <p>{upload.title || `Instagram post ${upload.postId}`}</p>
              </div>
              <time>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(upload.createdAt))}
              </time>
            </div>
          ))}
        </div>
      ) : (
        <div className="recent-upload-empty">
          No recent activity. Connect accounts and publish a post to get started.
        </div>
      )}
    </section>
  );
}
