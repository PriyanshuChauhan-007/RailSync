import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";
import SectionHeading from "../components/ui/SectionHeading.jsx";

const ease = [0.22, 1, 0.36, 1];
const hours = ["03:30", "04:38", "05:45", "06:53", "08:00"];

export default function SolutionPreview() {
  const reduceMotion = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const play = reduceMotion || inView;

  return (
    <section className="section solution" id="solution">
      <div className="section-inner">
        <SectionHeading eyebrow="Solution" title="Place work in the feasible gap">
          When a section is occupied by high-speed passenger traffic, RailSync strictly protects the path.
          When a verified gap exists, maintenance is integrated seamlessly.
        </SectionHeading>
        <p className="landing-example-note">
          ● LIVE OCC DISPATCH FEED | 4-ASPECT AUTOMATIC BLOCK INTERLOCKING | ACTIVE RESOLVER
        </p>

        <div className="timeline" ref={ref}>
          <div className="timeline-meta">
            <div>
              <strong>NR_SEC02 · Hazrat Nizamuddin — Faridabad</strong>
              Planning section
            </div>
            <div>
              <strong>03:30 — 08:00 IST</strong>
              Horizon
            </div>
            <div>
              <strong>NR_ENG001 · 120 min</strong>
              Track Tamp &amp; Rail Weld Inspection
            </div>
          </div>

          <div className="time-axis" aria-hidden="true">
            {hours.map((hour) => (
              <span key={hour}>{hour}</span>
            ))}
          </div>

          <div className="lane">
            <div className="lane-label">Train occupancy</div>
            <div className="lane-track">
              <motion.div
                className="block train"
                style={{ left: "5.6%", width: "5%" }}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.4, ease, delay: 0 }}
                title="12050 Gatimaan Express (160 km/h) · Super-Precedence"
              >
                12050
              </motion.div>
              <motion.div
                className="block train"
                style={{ left: "20%", width: "5%" }}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.4, ease, delay: 0 }}
                title="22436 Vande Bharat Express (130 km/h) · Super-Precedence"
              >
                22436
              </motion.div>
            </div>
          </div>

          <div className="lane">
            <div className="lane-label">Maintenance demand</div>
            <div className="lane-track">
              <motion.div
                className="block demand"
                style={{ left: "32%", width: "16%" }}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.4, ease, delay: 0 }}
              >
                NR_ENG001
              </motion.div>
            </div>
          </div>

          <div className="lane">
            <div className="lane-label">Available window</div>
            <div className="lane-track">
              <motion.div
                className="block window"
                style={{ left: "28%", width: "24%" }}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={play ? { opacity: 1 } : { opacity: 0 }}
                transition={{ duration: 0.4, ease, delay: 0 }}
              >
                Feasible OCC Gap (05:00 — 07:00)
              </motion.div>
            </div>
          </div>

          <div className="lane">
            <div className="lane-label">Integrated block</div>
            <div className="lane-track">
              <motion.div
                className="block placed"
                style={{ left: "32%", width: "16%" }}
                initial={
                  reduceMotion
                    ? { opacity: 1, x: 0, backgroundColor: "#2d6a4f" }
                    : { opacity: 0, x: -28, backgroundColor: "#b45309" }
                }
                animate={
                  play
                    ? {
                        opacity: 1,
                        x: 0,
                        backgroundColor: reduceMotion
                          ? "#2d6a4f"
                          : ["#b45309", "#b45309", "#2d6a4f"],
                      }
                    : { opacity: 0, x: -28, backgroundColor: "#b45309" }
                }
                transition={{
                  duration: reduceMotion ? 0 : 0.4,
                  ease,
                  delay: 0,
                  times: reduceMotion ? undefined : [0, 0.55, 1],
                }}
              >
                NR_ENG001 + NR_SNT001
              </motion.div>
            </div>
          </div>

          <motion.p
            className="confirmation"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={play ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ duration: 0.45, ease, delay: 0 }}
          >
            <strong>Valid integrated maintenance window</strong>
            Zero conflict on 12050 Gatimaan and 22436 Vande Bharat paths
          </motion.p>
        </div>

        <div className="solution-legend">
          <span>
            <i className="swatch train" /> Train occupancy
          </span>
          <span>
            <i className="swatch demand" /> Proposed maintenance
          </span>
          <span>
            <i className="swatch confirm" /> Confirmed shared block
          </span>
        </div>
      </div>
    </section>
  );
}
