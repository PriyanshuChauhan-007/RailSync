import "./strategicView.css";

const STRATEGIC_MACHINES = [
  {
    name: "Plasser Duomatic Track Tamper 7012",
    code: "TAMPER-7012",
    siding: "Tughlakabad (TKD) Machine Siding",
    speed: "30 km/h",
    transitTime: "22 min transit to km 14.2",
    targetSection: "NZM–TKD (km 14.2–22.4)",
    scheduledWeek: "Week 1 (Tactical Execution)",
    status: "DISPATCH READY",
    cycle: "4,500 sleeper packing quota",
  },
  {
    name: "Ballast Cleaning Machine (BCM 08-32)",
    code: "BCM-08-32",
    siding: "Faridabad (FDB) Goods Siding",
    speed: "25 km/h",
    transitTime: "35 min transit to km 24.1",
    targetSection: "TKD–FDB (km 22.4–29.0)",
    scheduledWeek: "Week 2 (Deep Screening)",
    status: "SCHEDULED",
    cycle: "Ballast cushion renewal",
  },
  {
    name: "Unimat 08-275 Points & Crossing Tamper",
    code: "UNIMAT-275",
    siding: "Ballabgarh (BVH) Siding",
    speed: "30 km/h",
    transitTime: "18 min transit to km 31.0",
    targetSection: "FDB–BVH (Turnouts 104A/B)",
    scheduledWeek: "Week 3 (Turnout Overhaul)",
    status: "ALLOCATED",
    cycle: "Interlocking point geometry",
  },
  {
    name: "TRD 4-Wheeler Heavy Tower Wagon (TW-04)",
    code: "TOWER-WAGON",
    siding: "OHE Substation Depot TKD",
    speed: "40 km/h",
    transitTime: "15 min transit to ES-04",
    targetSection: "NZM–BVH (25 kV Catenary)",
    scheduledWeek: "Week 4 (Traction Audit)",
    status: "POWER PERMIT SYNC",
    cycle: "OHE stagger & contact wire wear",
  },
];

export default function StrategicHorizonView({ territory }) {
  return (
    <div className="ir-strategic-view" aria-label="Strategic 30-Day Master Machine Outlook">
      <header className="ir-strategic-header">
        <div>
          <span className="ir-badge-accent">STRATEGIC 30-DAY OUTLOOK</span>
          <h3>Divisional Track Machine Allocation &amp; Monthly Asset Availability Plan</h3>
          <p>
            Coordinates heavy mechanised maintenance units (Plasser Duomatic, BCM, Unimat, TRD Tower Wagon)
            with depot siding transit buffers to clear monthly backlogs without halting trunk freight corridors.
          </p>
        </div>
        <div className="ir-strategic-kpi-badge">
          <span>30-DAY ASSET CLEARANCE:</span>
          <strong>100% P1 SAFETY DEFECTS CLEARED</strong>
        </div>
      </header>

      {/* Machine Allocation Cards */}
      <div className="ir-machines-grid">
        {STRATEGIC_MACHINES.map((machine) => (
          <div key={machine.code} className="ir-machine-card">
            <div className="ir-machine-top">
              <span className="ir-machine-code">{machine.code}</span>
              <span className="ir-machine-status">{machine.status}</span>
            </div>
            <h4>{machine.name}</h4>
            <div className="ir-machine-detail-row">
              <span>Siding Base:</span>
              <strong>{machine.siding}</strong>
            </div>
            <div className="ir-machine-detail-row">
              <span>Transit Logistics:</span>
              <strong className="text-transit">{machine.transitTime} ({machine.speed})</strong>
            </div>
            <div className="ir-machine-detail-row">
              <span>Target Section:</span>
              <strong>{machine.targetSection}</strong>
            </div>
            <div className="ir-machine-detail-row">
              <span>Assigned Horizon:</span>
              <strong className="text-horizon">{machine.scheduledWeek}</strong>
            </div>
            <div className="ir-machine-footer">
              <span>Scope: {machine.cycle}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 30-Day Maintenance Calendar Overview */}
      <div className="ir-strategic-calendar-block">
        <h4>30-Day Corridor Availability &amp; Shadow Possession Heatmap</h4>
        <div className="ir-calendar-weeks-row">
          <div className="ir-cal-week is-current">
            <div className="ir-week-title">WEEK 1 (CURRENT TACTICAL)</div>
            <div className="ir-week-bars">
              <div className="ir-week-bar is-active" style={{ width: "85%" }}>
                P-Way + S&amp;T + TRD Integrated Joint Block (2.0 hrs)
              </div>
              <div className="ir-week-bar is-freight" style={{ width: "95%" }}>
                Freight &amp; Passenger Capacity Preserved (94.2%)
              </div>
            </div>
            <span className="ir-week-sub">P1 USFD &amp; Point Machine Overhauls</span>
          </div>

          <div className="ir-cal-week">
            <div className="ir-week-title">WEEK 2 (BCM DEEP SCREENING)</div>
            <div className="ir-week-bars">
              <div className="ir-week-bar is-planned" style={{ width: "70%" }}>
                BCM Track Bed Screening &amp; Ballast Train Window
              </div>
              <div className="ir-week-bar is-freight" style={{ width: "92%" }}>
                Caution Orders Pre-notified to COA
              </div>
            </div>
            <span className="ir-week-sub">TKD–FDB km 22.4–29.0 Screening</span>
          </div>

          <div className="ir-cal-week">
            <div className="ir-week-title">WEEK 3 (TURNOUT INTERLOCKING)</div>
            <div className="ir-week-bars">
              <div className="ir-week-bar is-planned" style={{ width: "60%" }}>
                Unimat 08-275 Points &amp; Crossings Alignment
              </div>
              <div className="ir-week-bar is-freight" style={{ width: "96%" }}>
                Trunk Line Clearances Active
              </div>
            </div>
            <span className="ir-week-sub">Palwal Junction Yard Points</span>
          </div>

          <div className="ir-cal-week">
            <div className="ir-week-title">WEEK 4 (25 kV OHE RE-TENSION)</div>
            <div className="ir-week-bars">
              <div className="ir-week-bar is-planned" style={{ width: "75%" }}>
                Tower Wagon Catenary Stagger &amp; Droppers
              </div>
              <div className="ir-week-bar is-freight" style={{ width: "95%" }}>
                Power Block with Diesel Locomotive Bypass
              </div>
            </div>
            <span className="ir-week-sub">Ballabgarh Substation ES-04 to ES-09</span>
          </div>
        </div>
      </div>
    </div>
  );
}
