import { CalendarDays, Check, ExternalLink, Film, Image } from "lucide-react";
import "./instagram.css";

function formatDate(value) {
  if (!value) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export default function PostGallery({
  posts,
  selectedIds = [],
  onToggle,
}) {
  const selected = new Set(selectedIds);
  return (
    <div className="instagram-gallery">
      {posts.map((post) => {
        const isSelected = selected.has(post.id);
        return (
          <article
            className={`instagram-post card ${isSelected ? "selected" : ""}`}
            key={post.id}
          >
            <button
              type="button"
              className="post-select"
              aria-pressed={isSelected}
              aria-label={`${isSelected ? "Deselect" : "Select"} Instagram post`}
              onClick={() => onToggle?.(post.id)}
            >
              {isSelected && <Check size={16} />}
              <span>{isSelected ? "Selected" : "Select"}</span>
            </button>
            <div className="post-media">
              {post.mediaType === "VIDEO" && post.mediaUrl ? (
                <video
                  src={post.mediaUrl}
                  poster={post.thumbnailUrl || undefined}
                  controls
                  preload="metadata"
                  aria-label={post.caption || "Instagram video"}
                />
              ) : post.mediaUrl ? (
                <img
                  src={post.mediaUrl}
                  alt={post.caption || "Instagram post"}
                  loading="lazy"
                />
              ) : (
                <div className="post-media-fallback">
                  <Image size={22} />
                </div>
              )}
            </div>
            <div className="post-body">
              <div className="post-meta">
                <span>
                  <CalendarDays size={12} /> {formatDate(post.timestamp)}
                </span>
                <span>
                  <Film size={12} /> {post.mediaType}
                </span>
              </div>
              <p>{post.caption || "No caption"}</p>
              {post.permalink && (
                <a
                  className="muted-link"
                  href={post.permalink}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Instagram <ExternalLink size={12} />
                </a>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
