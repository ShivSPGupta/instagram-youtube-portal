export default function Settings() {
  return (
    <div className="content">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure your workspace and notification preferences.</p>
      </div>
      <div className="settings-grid">
        <section className="card setting-card">
          <h2>Workspace preferences</h2>
          <p>Control how your content workflow behaves.</p>
          <div className="setting-row">
            Auto-fetch new posts{" "}
            <button className="toggle" aria-label="Auto-fetch enabled" />
          </div>
          <div className="setting-row">
            Default upload visibility{" "}
            <span style={{ color: "#a78bfa" }}>Unlisted</span>
          </div>
        </section>
        <section className="card setting-card">
          <h2>Notifications</h2>
          <p>Choose when SocialFlow should contact you.</p>
          <div className="setting-row">
            Upload completion emails{" "}
            <button className="toggle" aria-label="Emails enabled" />
          </div>
          <div className="setting-row">
            Failed upload alerts{" "}
            <button className="toggle" aria-label="Alerts enabled" />
          </div>
        </section>
      </div>
    </div>
  );
}
