export function PageLoader(): JSX.Element {
  return (
    <div
      className="app-shell flex min-h-screen flex-col items-center justify-center gap-5 px-6"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="surface-card flex items-center gap-3 rounded-[20px] px-5 py-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] font-['Syne'] text-sm font-bold text-white shadow-[0_16px_32px_rgba(37,99,235,0.22)]">
          CQ
        </div>
        <div className="space-y-1">
          <p className="text-heading">CrowdIQ</p>
          <p className="text-meta">Syncing live venue intelligence</p>
        </div>
        <span className="live-dot" />
      </div>
      <div className="w-40">
        <div className="progress-track h-1.5">
          <div className="progress-value w-2/3" style={{ background: 'linear-gradient(90deg, #2563eb 0%, #3b82f6 100%)' }} />
        </div>
      </div>
    </div>
  );
}
