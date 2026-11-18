import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StatsCard from "../components/dashboard/StatsCard";
import ConnectedAccountCard from "../components/dashboard/ConnectedAccountCard";
import RecentUploads from "../components/dashboard/RecentUploads";
import RecentActivity from "../components/dashboard/RecentActivity";
import {
  fetchInstagramAccount,
  fetchInstagramHealth,
} from "../services/instagramApi";
import {
  fetchYouTubeHealth,
  fetchYouTubeHistory,
} from "../services/youtubeApi";

const initialDashboardData = {
  loading: true,
  instagram: { connected: false, profile: null, error: "" },
  youtube: { connected: false, channel: null, error: "" },
  uploads: [],
  errors: [],
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(initialDashboardData);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDashboard = useCallback(async () => {
    const [instagramResult, youtubeResult, historyResult] =
      await Promise.allSettled([
        fetchInstagramHealth(),
        fetchYouTubeHealth(),
        fetchYouTubeHistory(),
      ]);

    let instagram = { connected: false, profile: null, error: "" };
    let youtube = { connected: false, channel: null, error: "" };
    const errors = [];
    let uploads = [];

    if (instagramResult.status === "fulfilled") {
      instagram.connected = Boolean(instagramResult.value.configured);
      if (instagram.connected) {
        try {
          const account = await fetchInstagramAccount();
          instagram.profile = account.profile;
        } catch (error) {
          instagram.error = error.message;
          errors.push(`Instagram: ${error.message}`);
        }
      }
    } else {
      instagram.error = instagramResult.reason.message;
      errors.push(`Instagram: ${instagram.error}`);
    }

    if (youtubeResult.status === "fulfilled") {
      youtube.connected = Boolean(youtubeResult.value.connected);
      youtube.channel = youtubeResult.value.channel;
    } else {
      youtube.error = youtubeResult.reason.message;
      errors.push(`YouTube: ${youtube.error}`);
    }

    if (historyResult.status === "fulfilled") {
      uploads = historyResult.value.uploads;
    } else {
      errors.push(`Upload history: ${historyResult.reason.message}`);
    }

    setDashboard({
      loading: false,
      instagram,
      youtube,
      uploads,
      errors,
    });
    setRefreshing(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboard();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard, refreshKey]);

  const publishedCount = dashboard.uploads.filter(
    (upload) => upload.success,
  ).length;
  const failedCount = dashboard.uploads.filter(
    (upload) => !upload.success,
  ).length;
  const stats = [
    {
      label: "Instagram Posts",
      value: dashboard.loading
        ? "…"
        : dashboard.instagram.profile?.mediaCount ?? "—",
      detail: dashboard.instagram.profile
        ? `@${dashboard.instagram.profile.username}`
        : dashboard.loading
          ? "Loading connected account"
          : dashboard.instagram.connected
            ? "Couldn’t load account details"
            : "Connect Instagram to load",
      icon: "instagram",
    },
    {
      label: "Published Videos",
      value: dashboard.loading ? "…" : publishedCount,
      detail: "Successful uploads in this session",
      icon: "youtube",
    },
    {
      label: "Pending Uploads",
      value: "0",
      detail: "Uploads run immediately",
      icon: "clock",
    },
    {
      label: "Failed Uploads",
      value: dashboard.loading ? "…" : failedCount,
      detail: "Failed attempts in this session",
      icon: "alert",
    },
  ];

  return (
    <div className="content">
      <section className="welcome">
        <div>
          <div className="eyebrow">OVERVIEW</div>
          <h1>
            Good morning, Creator <span aria-hidden="true">✦</span>
          </h1>
          <p>Automate your content workflow from Instagram to YouTube.</p>
        </div>
        <div className="dashboard-actions">
          <button
            className="secondary-button"
            onClick={() => {
              setRefreshing(true);
              setRefreshKey((key) => key + 1);
            }}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "spin" : ""} size={14} />
            Refresh dashboard
          </button>
          <Link className="primary-button" to="/instagram">
            <RefreshCw size={14} /> Fetch Instagram posts
          </Link>
        </div>
      </section>

      {dashboard.errors.length > 0 && (
        <section className="dashboard-error" role="alert">
          {dashboard.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </section>
      )}

      <div className="stats-grid">
        {stats.map((stat) => (
          <StatsCard key={stat.label} stat={stat} />
        ))}
      </div>
      <div className="accounts-grid">
        <ConnectedAccountCard
          type="instagram"
          connected={dashboard.instagram.connected}
          loading={dashboard.loading}
          name={
            dashboard.instagram.profile
              ? `@${dashboard.instagram.profile.username}`
              : null
          }
          actionTo="/instagram"
        />
        <ConnectedAccountCard
          type="youtube"
          connected={dashboard.youtube.connected}
          loading={dashboard.loading}
          name={dashboard.youtube.channel?.title}
          actionTo="/youtube"
        />
      </div>
      <div className="two-column">
        <RecentUploads />
        <RecentActivity uploads={dashboard.uploads} />
      </div>
    </div>
  );
}
