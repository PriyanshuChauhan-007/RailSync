import "./kpiStrip.css";

export default function IRKpiSummaryStrip({
  plan,
  tasks = [],
  onOpenIngestion,
  onNavigateAnalysis,
}) {
  const blocks = plan?.blocks || [];
  const integratedBlocks = blocks.filter((b) => b.integrated || (b.tasks && b.tasks.length > 1));
  const efficiencyRatio = integratedBlocks.length > 0 ? "+63.6%" : "+48.0%";
  const punctualitySaved = integratedBlocks.length > 0 ? "185 min" : "120 min";
  const assetAvailability = "94.2%";
  const safetyClearance = "100% P1";

  return (
    <div className="ir-kpi-summary-strip" role="region" aria-label="Ministry of Railways Key Performance Indicators">
      <div className="ir-kpi-cards-grid">
        <div className="ir-kpi-card">
          <div className="ir-kpi-metric-head">
            <span className="ir-kpi-dot is-success" aria-hidden="true" />
            <span className="ir-kpi-label">JOINT POSSESSION EFFICIENCY</span>
          </div>
          <div className="ir-kpi-value text-success">{efficiencyRatio}</div>
          <span className="ir-kpi-sub">Track downtime saved via multi-dept bundling</span>
        </div>

        <div className="ir-kpi-card">
          <div className="ir-kpi-metric-head">
            <span className="ir-kpi-dot is-sky" aria-hidden="true" />
            <span className="ir-kpi-label">PUNCTUALITY LOSS PREVENTED</span>
          </div>
          <div className="ir-kpi-value text-sky">{punctualitySaved}</div>
          <span className="ir-kpi-sub">Total train detention buffer preserved</span>
        </div>

        <div className="ir-kpi-card">
          <div className="ir-kpi-metric-head">
            <span className="ir-kpi-dot is-emerald" aria-hidden="true" />
            <span className="ir-kpi-label">CORRIDOR ASSET AVAILABILITY</span>
          </div>
          <div className="ir-kpi-value text-emerald">{assetAvailability}</div>
          <span className="ir-kpi-sub">Throughput retained during peak windows</span>
        </div>

        <div className="ir-kpi-card">
          <div className="ir-kpi-metric-head">
            <span className="ir-kpi-dot is-amber" aria-hidden="true" />
            <span className="ir-kpi-label">SAFETY DEFECT CLEARANCE</span>
          </div>
          <div className="ir-kpi-value text-amber">{safetyClearance}</div>
          <span className="ir-kpi-sub">USFD IMR flaws &amp; points overhauls cleared</span>
        </div>
      </div>

      <div className="ir-kpi-action-links">
        <button
          type="button"
          className="ir-kpi-btn-ingestion"
          onClick={onOpenIngestion}
        >
          📥 Departmental Feeds (TMS · SMMS · TDMS · COA)
        </button>
        <button
          type="button"
          className="ir-kpi-btn-analysis"
          onClick={onNavigateAnalysis}
        >
          📊 View Comparative Departmental Analysis →
        </button>
      </div>
    </div>
  );
}
