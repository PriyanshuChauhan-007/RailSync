import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./index.ts";
import {
  corridors,
  stations,
  sections,
  maintenanceTasks,
  trainServices,
} from "./schema.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

export async function seedCorridorsToDatabase() {
  console.log("Starting PostgreSQL corridor database synchronization...");
  const corridorsDir = path.join(DATA_DIR, "corridors");
  const fixturesDir = path.join(DATA_DIR, "fixtures");

  const dirsToScan = [
    ...(fs.existsSync(corridorsDir)
      ? fs.readdirSync(corridorsDir).map((d) => path.join(corridorsDir, d))
      : []),
    ...(fs.existsSync(fixturesDir)
      ? fs.readdirSync(fixturesDir).map((d) => path.join(fixturesDir, d))
      : []),
  ];

  for (const dir of dirsToScan) {
    const manifestPath = path.join(dir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      const territoryId = manifest.territory_id;
      if (!territoryId) continue;

      // 1. Insert or Update Corridor
      await db
        .insert(corridors)
        .values({
          territoryId,
          displayName: manifest.display_name || territoryId,
          zone: territoryId.includes("delhi") ? "NR" : territoryId.includes("western") ? "WR" : territoryId.includes("dfc") ? "DFC" : "ER",
          division: "Operational Division",
          gauge: "1676mm Broad Gauge",
          tractionType: "25 kV AC 50 Hz OHE",
          mpsKmh: 130,
          totalKm: "195.0",
        })
        .onConflictDoNothing();

      // 2. Stations
      const stationsPath = path.join(dir, "stations.json");
      if (fs.existsSync(stationsPath)) {
        const stationList = JSON.parse(fs.readFileSync(stationsPath, "utf-8"));
        for (const st of stationList) {
          await db
            .insert(stations)
            .values({
              stationId: st.station_id,
              territoryId,
              stationName: st.station_name,
              chainageKm: String(st.km ?? 0.0),
              stationCode: st.station_id,
              stationClass: "A",
              numberOfLines: 4,
              orderIndex: st.order ?? 1,
            })
            .onConflictDoNothing();
        }
      }

      // 3. Sections
      const sectionsPath = path.join(dir, "sections.json");
      if (fs.existsSync(sectionsPath)) {
        const sectionList = JSON.parse(fs.readFileSync(sectionsPath, "utf-8"));
        for (const sec of sectionList) {
          if (!sec.from_station || !sec.to_station) continue;
          await db
            .insert(sections)
            .values({
              sectionId: sec.section_id,
              territoryId,
              fromStation: sec.from_station,
              toStation: sec.to_station,
              trackDirection: "BI",
              lengthKm: "10.0",
              tqiCurrentScore: "38.5",
            })
            .onConflictDoNothing();
        }
      }

      // 4. Maintenance Tasks
      const tasksPath = path.join(dir, "maintenance_tasks.json");
      if (fs.existsSync(tasksPath)) {
        const taskList = JSON.parse(fs.readFileSync(tasksPath, "utf-8"));
        for (const task of taskList) {
          if (!task.task_id || !task.section_id) continue;
          await db
            .insert(maintenanceTasks)
            .values({
              taskId: task.task_id,
              territoryId,
              sectionId: task.section_id,
              department: task.department ?? "ENGINEERING",
              taskType: task.task_type ?? "Routine Track Inspection",
              durationMinutes: task.required_duration_minutes ?? 120,
              criticalityScore: task.criticality_score ?? 8,
              mlUrgencyScore: "88.0",
              gmtLoadYear: "48.5",
              requiresPowerCut: Boolean(task.requires_power_cut),
              requiredMachineType: task.required_machine_type ?? null,
              status: "PENDING",
            })
            .onConflictDoNothing();
        }
      }

      // 5. Train Services
      const servicesPath = path.join(dir, "train_services.json");
      if (fs.existsSync(servicesPath)) {
        const trainList = JSON.parse(fs.readFileSync(servicesPath, "utf-8"));
        for (const tr of trainList) {
          if (!tr.train_id) continue;
          await db
            .insert(trainServices)
            .values({
              trainId: tr.train_id,
              territoryId,
              serviceNumber: tr.service_number ?? tr.train_id,
              serviceName: tr.service_name ?? `Express ${tr.train_id}`,
              serviceCategory: tr.service_category ?? "PREMIER",
              maxSectionSpeedKmh: 130,
              priorityRank: 1,
            })
            .onConflictDoNothing();
        }
      }
    } catch (e) {
      console.warn(`Error seeding corridor ${dir}:`, e);
    }
  }

  console.log("✓ PostgreSQL Database successfully populated with Indian Railways corridor schemas and assets!");
}
