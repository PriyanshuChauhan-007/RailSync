/**
 * RailSync PostgreSQL Database Schema (Drizzle ORM)
 * Smart India Hackathon (SIH 2026) Problem Statement 26027
 * 
 * Enforces temporal exclusion logic (tsrange / tstzrange) ensuring zero physical overlaps
 * between active train paths and maintenance block possessions on identical track circuits.
 */

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  varchar,
  jsonb,
  numeric,
  index,
  customType,
} from "drizzle-orm/pg-core";

// PostgreSQL Range type for temporal block reservations
const tstzrange = customType<{ data: string }>({
  dataType() {
    return "tstzrange";
  },
});

// 0. App Users (Linked with Firebase Auth UID)
export const users = pgTable("users", {
  id: varchar("id", { length: 128 }).primaryKey(), // Firebase UID
  email: text("email").notNull(),
  displayName: text("display_name"),
  role: varchar("role", { length: 32 }).default("CHIEF_CONTROLLER"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 1. Corridors
export const corridors = pgTable("corridors", {
  territoryId: varchar("territory_id", { length: 64 }).primaryKey(),
  displayName: text("display_name").notNull(),
  zone: varchar("zone", { length: 32 }).notNull(), // NR, WR, ER, NCR, DFC
  division: varchar("division", { length: 64 }).notNull(),
  gauge: varchar("gauge", { length: 64 }).default("1676mm Broad Gauge"),
  tractionType: varchar("traction_type", { length: 64 }).default("25 kV AC 50 Hz OHE"),
  maxPermissibleSpeedKmh: integer("mps_kmh").default(130),
  totalKm: numeric("total_km", { precision: 6, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Stations
export const stations = pgTable("stations", {
  stationId: varchar("station_id", { length: 32 }).primaryKey(),
  territoryId: varchar("territory_id", { length: 64 }).notNull().references(() => corridors.territoryId),
  stationName: text("station_name").notNull(),
  chainageKm: numeric("chainage_km", { precision: 6, scale: 2 }).notNull(),
  stationCode: varchar("station_code", { length: 16 }).notNull(),
  stationClass: varchar("station_class", { length: 16 }).default("B"), // Special, A, B, C
  numberOfLines: integer("number_of_lines").default(4),
  orderIndex: integer("order_index").notNull(),
});

// 3. Physical Track Sections
export const sections = pgTable("sections", {
  sectionId: varchar("section_id", { length: 64 }).primaryKey(),
  territoryId: varchar("territory_id", { length: 64 }).notNull().references(() => corridors.territoryId),
  fromStation: varchar("from_station", { length: 32 }).notNull().references(() => stations.stationId),
  toStation: varchar("to_station", { length: 32 }).notNull().references(() => stations.stationId),
  trackDirection: varchar("track_direction", { length: 16 }).notNull(), // UP, DOWN, BI
  trackClassification: varchar("track_classification", { length: 64 }).default("Group A High Density Network"),
  lengthKm: numeric("length_km", { precision: 5, scale: 2 }).notNull(),
  signalingType: varchar("signaling_type", { length: 64 }).default("Automatic 4-Aspect"),
  elementaryPowerZoneId: varchar("elementary_power_zone_id", { length: 64 }),
  tqiCurrentScore: numeric("tqi_score", { precision: 4, scale: 1 }).default("38.5"),
});

// 4. Maintenance Work Orders (Ingested from TMS / SMMS / TDMS)
export const maintenanceTasks = pgTable("maintenance_tasks", {
  taskId: varchar("task_id", { length: 64 }).primaryKey(),
  territoryId: varchar("territory_id", { length: 64 }).notNull().references(() => corridors.territoryId),
  sectionId: varchar("section_id", { length: 64 }).notNull().references(() => sections.sectionId),
  department: varchar("department", { length: 32 }).notNull(), // ENGINEERING, S&T, TRD
  taskType: text("task_type").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  criticalityScore: integer("criticality_score").notNull(), // 1 to 10
  mlUrgencyScore: numeric("ml_urgency_score", { precision: 4, scale: 1 }).default("85.0"),
  gmtLoadYear: numeric("gmt_load", { precision: 5, scale: 1 }).default("48.5"),
  requiresPowerCut: boolean("requires_power_cut").default(false),
  requiredMachineType: varchar("required_machine_type", { length: 64 }),
  compatibilityGroup: varchar("compatibility_group", { length: 32 }).default("STANDARD"),
  status: varchar("status", { length: 32 }).default("PENDING"), // PENDING, BUNDLED, COMPLETED
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Timetable Train Services (Ingested from COA)
export const trainServices = pgTable("train_services", {
  trainId: varchar("train_id", { length: 32 }).primaryKey(),
  territoryId: varchar("territory_id", { length: 64 }).notNull().references(() => corridors.territoryId),
  serviceNumber: varchar("service_number", { length: 32 }).notNull(),
  serviceName: text("service_name").notNull(),
  serviceCategory: varchar("service_category", { length: 32 }).notNull(), // PREMIER, SUPERFAST, MAIL_EXP, FREIGHT
  maxSectionSpeedKmh: integer("max_speed_kmh").default(130),
  priorityRank: integer("priority_rank").default(1), // 1 (Rajdhani) to 5 (Freight)
  locoClass: varchar("loco_class", { length: 32 }).default("WAP-7"),
});

// 6. Section Train Occupancy Windows
export const trainOccupancies = pgTable("train_occupancies", {
  occupancyId: varchar("occupancy_id", { length: 64 }).primaryKey(),
  trainId: varchar("train_id", { length: 32 }).notNull().references(() => trainServices.trainId),
  sectionId: varchar("section_id", { length: 64 }).notNull().references(() => sections.sectionId),
  entryTime: timestamp("entry_time", { withTimezone: true }).notNull(),
  exitTime: timestamp("exit_time", { withTimezone: true }).notNull(),
  temporalRange: tstzrange("temporal_range"),
});

// 7. Optimized Maintenance Block Possessions (CP-SAT Solver Output)
export const blockPossessions = pgTable(
  "block_possessions",
  {
    blockId: varchar("block_id", { length: 64 }).primaryKey(),
    territoryId: varchar("territory_id", { length: 64 }).notNull().references(() => corridors.territoryId),
    sectionId: varchar("section_id", { length: 64 }).notNull().references(() => sections.sectionId),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    temporalWindow: tstzrange("temporal_window"),
    durationMinutes: integer("duration_minutes").notNull(),
    isIntegratedShadowBlock: boolean("is_integrated").default(true),
    bundledTaskIds: jsonb("bundled_task_ids").notNull(),
    powerZoneId: varchar("power_zone_id", { length: 64 }),
    assignedMachineId: varchar("assigned_machine_id", { length: 64 }),
    machineSidingTransitMinutes: integer("machine_transit_minutes").default(20),
    efficiencyGainPercent: numeric("efficiency_gain_percent", { precision: 4, scale: 1 }).default("63.6"),
    punctualitySavedMinutes: integer("punctuality_saved_minutes").default(185),
    solverStatus: varchar("solver_status", { length: 32 }).default("OPTIMAL"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_possession_temporal").on(table.sectionId, table.startTime, table.endTime),
  ]
);
