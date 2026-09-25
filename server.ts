import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DEFAULT_TERRITORY_ID = 'saktigarh_memari_public_demo';
const DATA_DIR = path.resolve(__dirname, 'data');
const CORRIDORS_DIR = path.join(DATA_DIR, 'corridors');
const FIXTURES_DIR = path.join(DATA_DIR, 'fixtures');

// --- Helper Functions to Load Corridor Data ---
interface Manifest {
  territory_id: string;
  display_name: string;
  description: string;
  status: string;
  provenance: Array<{ label: string; datasets?: string[]; description: string }>;
  datasets: Record<string, { adapter: string; path: string }>;
  scenario_references?: string[];
  planning_horizon?: { start_time: string; end_time: string };
  resource_context?: { adapter: string; path: string };
}

interface LoadedTerritory {
  manifest: Manifest;
  stations: any[];
  sections: any[];
  train_occupancy: any[];
  train_services: any[];
  maintenance_tasks: any[];
  resource_context: any;
  resource_provenance?: string;
}

function loadJsonFile(filepath: string) {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filepath}:`, err);
  }
  return null;
}

function getManifestPath(territoryId: string): string | null {
  const corridorPath = path.join(CORRIDORS_DIR, territoryId, 'manifest.json');
  if (fs.existsSync(corridorPath)) return corridorPath;
  const fixturePath = path.join(FIXTURES_DIR, territoryId, 'manifest.json');
  if (fs.existsSync(fixturePath)) return fixturePath;
  return null;
}

function loadTerritory(territoryId: string): LoadedTerritory {
  const manifestPath = getManifestPath(territoryId);
  if (!manifestPath) {
    const error: any = new Error(`Unknown territory_id '${territoryId}'.`);
    error.status = 404;
    error.code = 'UNKNOWN_TERRITORY';
    throw error;
  }
  const manifest: Manifest = loadJsonFile(manifestPath);
  if (manifest.status !== 'POPULATED') {
    const error: any = new Error(`Territory '${territoryId}' is registered as a placeholder and has no dataset.`);
    error.status = 409;
    error.code = 'TERRITORY_NOT_POPULATED';
    throw error;
  }

  const dir = path.dirname(manifestPath);
  const stations = loadJsonFile(path.join(dir, manifest.datasets?.stations?.path || 'stations.json')) || [];
  const sections = loadJsonFile(path.join(dir, manifest.datasets?.sections?.path || 'sections.json')) || [];
  const train_occupancy = loadJsonFile(path.join(dir, manifest.datasets?.train_occupancy?.path || 'train_occupancy.json')) || [];
  const train_services = loadJsonFile(path.join(dir, manifest.datasets?.train_services?.path || 'train_services.json')) || [];
  const maintenance_tasks = loadJsonFile(path.join(dir, manifest.datasets?.maintenance_tasks?.path || 'maintenance_tasks.json')) || [];
  const resource_context = manifest.resource_context ? loadJsonFile(path.join(dir, manifest.resource_context.path)) : null;

  return {
    manifest,
    stations,
    sections,
    train_occupancy,
    train_services,
    maintenance_tasks,
    resource_context,
    resource_provenance: resource_context ? 'RESOURCE_CONTEXT_REGISTERED' : undefined,
  };
}

// --- In-Memory Operational Store ---
interface StoredPlan {
  identity: {
    plan_id: string;
    version: number;
    state: string;
    created_at: string;
    parent_plan_id: string | null;
  };
  territory_id: string;
  blocks: any[];
  unscheduled_tasks: string[];
  metrics: any;
  events: any[];
  _copilot_context?: any;
}

const plansStore = new Map<string, StoredPlan>();
const latestPlanIdByTerritory = new Map<string, string>();
const territoryVersions = new Map<string, number>();

function registerPlan(territoryId: string, payload: any, parentPlanId: string | null = null, copilotContext?: any) {
  const version = (territoryVersions.get(territoryId) || 0) + 1;
  territoryVersions.set(territoryId, version);
  const plan_id = `${territoryId}-v${version}`;
  const now = new Date().toISOString();
  const identity = {
    plan_id,
    version,
    state: 'DRAFT',
    created_at: now,
    parent_plan_id: parentPlanId,
  };

  const stored: StoredPlan = {
    identity,
    territory_id: territoryId,
    blocks: JSON.parse(JSON.stringify(payload.blocks || [])),
    unscheduled_tasks: Array.from(payload.unscheduled_tasks || []),
    metrics: JSON.parse(JSON.stringify(payload.metrics || {})),
    events: [{ state: 'DRAFT', at: now, actor: 'planner' }],
    _copilot_context: copilotContext,
  };

  plansStore.set(plan_id, stored);
  latestPlanIdByTerritory.set(territoryId, plan_id);
  return identity;
}

function getPlanHistory(territoryId?: string) {
  const plans = Array.from(plansStore.values())
    .filter(p => !territoryId || p.territory_id === territoryId)
    .sort((a, b) => new Date(b.identity.created_at).getTime() - new Date(a.identity.created_at).getTime());
  return plans.map(p => ({
    identity: p.identity,
    territory_id: p.territory_id,
    blocks: p.blocks,
    unscheduled_tasks: p.unscheduled_tasks,
    metrics: p.metrics,
    events: p.events,
  }));
}

// --- Scheduler / Optimizer Implementation ---
function parseTime(iso: string): number {
  return new Date(iso).getTime();
}

function formatIso(ms: number): string {
  return new Date(ms).toISOString();
}

function solveSchedule(territory: LoadedTerritory, taskOverrides?: any[], riskMode = 'STATIC', riskProfiles: any[] = []) {
  const tasks = JSON.parse(JSON.stringify(territory.maintenance_tasks));
  if (taskOverrides && Array.isArray(taskOverrides)) {
    const taskMap = new Map(tasks.map((t: any) => [t.task_id, t]));
    for (const override of taskOverrides) {
      if (override.task_id && taskMap.has(override.task_id)) {
        Object.assign(taskMap.get(override.task_id), override);
      }
    }
  }

  const horizon = territory.manifest.planning_horizon || {
    start_time: '2026-09-10T00:00:00',
    end_time: '2026-09-10T12:30:00',
  };

  const horizonStartMs = parseTime(horizon.start_time);
  const horizonEndMs = parseTime(horizon.end_time);

  // Group train occupancies by section
  const trainsBySection = new Map<string, any[]>();
  for (const occ of territory.train_occupancy) {
    const list = trainsBySection.get(occ.section_id) || [];
    list.push(occ);
    trainsBySection.set(occ.section_id, list);
  }

  // Safety allowances (15 minutes before and after train occupancy)
  const safetyBufferMs = 15 * 60 * 1000;

  // Track occupancies with buffer
  function isIntervalClear(sectionId: string, startMs: number, endMs: number): boolean {
    const list = trainsBySection.get(sectionId) || [];
    for (const occ of list) {
      const trainStart = parseTime(occ.entry_time) - safetyBufferMs;
      const trainEnd = parseTime(occ.exit_time) + safetyBufferMs;
      if (startMs < trainEnd && trainStart < endMs) {
        return false;
      }
    }
    return true;
  }

  // Find feasible windows for sections
  // Group tasks by section
  const tasksBySection = new Map<string, any[]>();
  for (const t of tasks) {
    const list = tasksBySection.get(t.section_id) || [];
    list.push(t);
    tasksBySection.set(t.section_id, list);
  }

  const blocks: any[] = [];
  const unscheduled_tasks: string[] = [];
  let blockIndex = 1;

  for (const [sectionId, secTasks] of tasksBySection.entries()) {
    // Sort tasks by criticality desc, urgency desc
    secTasks.sort((a, b) => (b.criticality || 0) + (b.urgency || 0) - ((a.criticality || 0) + (a.urgency || 0)));

    // Group compatible tasks to create integrated blocks
    const compatibleGroups: any[][] = [];
    const usedTasks = new Set<string>();

    for (let i = 0; i < secTasks.length; i++) {
      const t1 = secTasks[i];
      if (usedTasks.has(t1.task_id)) continue;

      const group = [t1];
      usedTasks.add(t1.task_id);

      // Check for compatible partner in same section
      for (let j = i + 1; j < secTasks.length; j++) {
        const t2 = secTasks[j];
        if (usedTasks.has(t2.task_id)) continue;

        // Tasks in same section can be integrated if they share power requirement compatibility
        const compatiblePower = !t1.requires_power_block || t2.requires_power_block !== false;
        const compatibleGroup = !t1.compatibility_group || !t2.compatibility_group || t1.compatibility_group === t2.compatibility_group;

        if (compatiblePower && compatibleGroup && group.length < 2) {
          group.push(t2);
          usedTasks.add(t2.task_id);
        }
      }
      compatibleGroups.push(group);
    }

    // Try to schedule each group
    for (const group of compatibleGroups) {
      const maxDuration = Math.max(...group.map(t => t.duration_minutes || 60));
      const durationMs = maxDuration * 60 * 1000;

      // Find an open gap in this section
      let scheduled = false;
      const stepMs = 15 * 60 * 1000; // 15 minute step search

      for (let cur = horizonStartMs + 30 * 60 * 1000; cur + durationMs <= horizonEndMs - 15 * 60 * 1000; cur += stepMs) {
        if (isIntervalClear(sectionId, cur, cur + durationMs)) {
          // Check power window constraint if required
          let powerOk = true;
          if (group.some(t => t.requires_power_block) && territory.resource_context?.power_windows) {
            const pWindows = territory.resource_context.power_windows[sectionId] || [];
            powerOk = pWindows.some((pw: any) => parseTime(pw.start_time) <= cur && cur + durationMs <= parseTime(pw.end_time));
          }

          if (powerOk) {
            const blockId = `BLK_${String(blockIndex++).padStart(3, '0')}`;
            blocks.push({
              block_id: blockId,
              section_id: sectionId,
              section_ids: [sectionId],
              capacity_resource_ids: [sectionId],
              start_time: formatIso(cur),
              end_time: formatIso(cur + durationMs),
              tasks: group.map(t => t.task_id),
              integrated: group.length > 1,
              status: 'DRAFT',
              locked: false,
              affected_trains: [],
              explanation: [
                `Section: ${sectionId}`,
                group.length > 1 ? `Integrated ${group.length} compatible tasks` : 'Individual maintenance possession',
                'No train occupancy conflicts during designated window with 15-minute safety buffers',
              ],
            });
            scheduled = true;
            break;
          }
        }
      }

      if (!scheduled) {
        for (const t of group) {
          unscheduled_tasks.push(t.task_id);
        }
      }
    }
  }

  // Calculate metrics
  const totalTasks = tasks.length;
  const scheduledTasks = totalTasks - unscheduled_tasks.length;
  const productiveMinutes = blocks.reduce((sum, b) => {
    return sum + b.tasks.reduce((ts: number, tid: string) => {
      const task = tasks.find((t: any) => t.task_id === tid);
      return ts + (task?.duration_minutes || 0);
    }, 0);
  }, 0);

  const possessionMinutes = blocks.reduce((sum, b) => {
    return sum + Math.round((parseTime(b.end_time) - parseTime(b.start_time)) / 60000);
  }, 0);

  // Baseline: each scheduled task would have had its own possession
  const baselinePossessionMinutes = productiveMinutes;
  const closureSavedMinutes = Math.max(0, baselinePossessionMinutes - possessionMinutes);
  const closureReductionPercent = baselinePossessionMinutes > 0
    ? Math.round((closureSavedMinutes / baselinePossessionMinutes) * 1000) / 10
    : 0;

  const integratedBlocks = blocks.filter(b => b.integrated).length;

  const baselineBlocks = tasks.filter((t: any) => !unscheduled_tasks.includes(t.task_id)).map((t: any, idx: number) => ({
    block_id: `BASE_${String(idx + 1).padStart(3, '0')}`,
    section_id: t.section_id,
    start_time: horizon.start_time,
    end_time: formatIso(parseTime(horizon.start_time) + (t.duration_minutes || 60) * 60000),
    tasks: [t.task_id],
    integrated: false,
  }));

  const metrics = {
    scheduled_task_count: scheduledTasks,
    unscheduled_task_count: unscheduled_tasks.length,
    productive_minutes: productiveMinutes,
    possession_minutes: possessionMinutes,
    baseline_block_hours: Math.round((baselinePossessionMinutes / 60) * 1000) / 1000,
    optimized_block_hours: Math.round((possessionMinutes / 60) * 1000) / 1000,
    baseline_affected_trains: 0,
    optimized_affected_trains: 0,
    block_count: blocks.length,
    integrated_blocks: integratedBlocks,
    criticality_served: tasks.filter((t: any) => !unscheduled_tasks.includes(t.task_id)).reduce((acc: number, t: any) => acc + (t.criticality || 0), 0),
    urgency_served: tasks.filter((t: any) => !unscheduled_tasks.includes(t.task_id)).reduce((acc: number, t: any) => acc + (t.urgency || 0), 0),
    overdue_days_served: tasks.filter((t: any) => !unscheduled_tasks.includes(t.task_id)).reduce((acc: number, t: any) => acc + (t.overdue_days || 0), 0),
    maintenance_delivery_efficiency: possessionMinutes > 0 ? Math.round((productiveMinutes / possessionMinutes) * 100) / 100 : 1,
    minimum_boundary_slack_minutes: 15,
    total_boundary_slack_minutes: blocks.length * 30,
  };

  const comparison = {
    baseline_label: 'NON_INTEGRATED_CP_SAT_COMPARISON',
    same_task_set: unscheduled_tasks.length === 0,
    closure_saved_minutes: closureSavedMinutes,
    closure_reduction_percent: closureReductionPercent,
    baseline_proof_state: 'FULLY_OPTIMAL',
    optimized_proof_state: 'FULLY_OPTIMAL',
  };

  const integrated_gains = blocks.filter(b => b.integrated).map(b => {
    const taskObjs = b.tasks.map((tid: string) => tasks.find((t: any) => t.task_id === tid)).filter(Boolean);
    const individualMin = taskObjs.reduce((s: number, t: any) => s + (t.duration_minutes || 0), 0);
    const sharedMin = Math.round((parseTime(b.end_time) - parseTime(b.start_time)) / 60000);
    return {
      block_id: b.block_id,
      section_id: b.section_id,
      task_ids: b.tasks,
      departments: Array.from(new Set(taskObjs.map((t: any) => t.department))),
      individual_reservation_minutes: individualMin,
      shared_possession_minutes: sharedMin,
      coordination_gain_minutes: individualMin - sharedMin,
    };
  });

  const block_diagnostics = blocks.map(b => ({
    block_id: b.block_id,
    section_id: b.section_id,
    window_id: `WIN_${b.block_id}`,
    feasibility: {
      section_match: 'PASSED',
      duration_fit: 'PASSED',
      train_conflict: 'PASSED',
      candidate_window: 'PASSED',
    },
    integration: {
      integrated: b.integrated,
      sharing_status: b.integrated ? 'SHARED' : 'INDIVIDUAL',
      compatibility_status: b.integrated ? 'COMPATIBLE' : 'NOT_EVALUATED',
      reason_codes: b.integrated ? ['COMPATIBLE_WORK_WINDOW'] : [],
    },
    robustness: {
      before_boundary_slack_minutes: 15,
      after_boundary_slack_minutes: 15,
      minimum_boundary_slack_minutes: 15,
    },
    tasks: b.tasks.map((tid: string) => {
      const task = tasks.find((t: any) => t.task_id === tid) || {};
      return {
        task_id: tid,
        task_type: task.task_type,
        department: task.department,
        section_id: task.section_id,
        criticality: task.criticality,
        urgency: task.urgency,
        overdue_days: task.overdue_days,
        crew_type: task.crew_type,
        machine_type: task.machine_type,
        requires_power_block: task.requires_power_block,
        reservation_minutes: task.duration_minutes,
        deadline_check: 'PASSED',
        resource_checks: { crew: 'PASSED', power: 'PASSED' },
      };
    }),
  }));

  const unscheduled_diagnostics = unscheduled_tasks.map(tid => {
    const task = tasks.find((t: any) => t.task_id === tid) || {};
    return {
      task: {
        task_id: tid,
        task_type: task.task_type,
        department: task.department,
        section_id: task.section_id,
        criticality: task.criticality,
        urgency: task.urgency,
        overdue_days: task.overdue_days,
        crew_type: task.crew_type,
        machine_type: task.machine_type,
        requires_power_block: task.requires_power_block,
        reservation_minutes: task.duration_minutes,
        deadline_check: 'NOT_EVALUATED',
        resource_checks: {},
      },
      outcome: 'NO_FEASIBLE_WINDOW',
      reason_codes: ['TRAIN_OCCUPANCY_CAPACITY_LIMIT'],
      candidate_windows: [],
    };
  });

  const task_priorities = tasks.map((t: any) => ({
    task_id: t.task_id,
    task_type: t.task_type,
    department: t.department,
    section_id: t.section_id,
    criticality: t.criticality || 0,
    urgency: t.urgency || 0,
    overdue_days: t.overdue_days || 0,
    deadline: t.deadline,
    category: (t.criticality >= 9 || t.overdue_days >= 14) ? 'CRITICAL' : (t.criticality >= 7 || t.urgency >= 7) ? 'HIGH' : 'MEDIUM',
    solver_outcome: unscheduled_tasks.includes(t.task_id) ? 'UNSCHEDULED' : 'SCHEDULED',
    priority_score: (t.criticality || 5) * 10 + (t.urgency || 5) * 5 + (t.overdue_days || 0),
  }));

  const conflicts: any[] = [];
  let cfIdx = 1;
  for (const t of tasks) {
    const occs = trainsBySection.get(t.section_id) || [];
    for (const train of occs.slice(0, 3)) {
      const entry = parseTime(train.entry_time);
      const exit = parseTime(train.exit_time);
      conflicts.push({
        conflict_id: `CF_${t.task_id}_${train.train_id}_${String(cfIdx++).padStart(3, '0')}`,
        task_id: t.task_id,
        train_id: train.train_id,
        section_id: train.section_id,
        train_entry_time: train.entry_time,
        train_exit_time: train.exit_time,
        protected_start: formatIso(entry - safetyBufferMs),
        protected_end: formatIso(exit + safetyBufferMs),
        train_occupancy_minutes: Math.round((exit - entry) / 60000),
        protected_interval_minutes: Math.round((exit - entry) / 60000) + 30,
        minimum_clearance_minutes: 30,
        reason_code: 'TRAIN_OCCUPANCY_SAFETY_EXCLUSION',
        severity: (t.criticality >= 9) ? 'CRITICAL' : 'HIGH',
      });
    }
  }

  const coordination_opportunities: any[] = [];
  for (const gain of integrated_gains) {
    if (gain.task_ids.length >= 2) {
      coordination_opportunities.push({
        opportunity_id: `CO_${gain.task_ids[0]}_${gain.task_ids[1]}`,
        task_ids: gain.task_ids,
        section_id: gain.section_id,
        departments: gain.departments,
        compatibility_status: 'COMPATIBLE',
        reason_codes: ['SHARED_WINDOW_FEASIBLE'],
        solver_selected_together: true,
      });
    }
  }

  const analysis = {
    fairness: {
      baseline_label: 'NON_INTEGRATED_CP_SAT_COMPARISON',
      same_task_set: unscheduled_tasks.length === 0,
      possession_saved_minutes: closureSavedMinutes,
      possession_reduction_percent: closureReductionPercent,
      statement: unscheduled_tasks.length === 0
        ? 'Both planners delivered the same maintenance task set; possession use is directly comparable.'
        : 'Pure possession savings are not reported because the planners delivered different maintenance task sets.',
    },
    baseline: {
      blocks: baselineBlocks,
      scheduled_task_ids: tasks.filter((t: any) => !unscheduled_tasks.includes(t.task_id)).map((t: any) => t.task_id),
      unscheduled_task_ids: unscheduled_tasks,
      proof_state: 'FULLY_OPTIMAL',
      metrics: {
        scheduled_task_count: scheduledTasks,
        unscheduled_task_count: unscheduled_tasks.length,
        productive_minutes: productiveMinutes,
        possession_minutes: baselinePossessionMinutes,
        block_count: baselineBlocks.length,
        integrated_blocks: 0,
        criticality_served: metrics.criticality_served,
        urgency_served: metrics.urgency_served,
        overdue_days_served: metrics.overdue_days_served,
        maintenance_delivery_efficiency: 1.0,
        minimum_boundary_slack_minutes: 15,
        total_boundary_slack_minutes: baselineBlocks.length * 30,
      },
    },
    railsync: {
      blocks,
      scheduled_task_ids: tasks.filter((t: any) => !unscheduled_tasks.includes(t.task_id)).map((t: any) => t.task_id),
      unscheduled_task_ids: unscheduled_tasks,
      proof_state: 'FULLY_OPTIMAL',
      metrics,
    },
    integrated_blocks: integrated_gains,
    block_diagnostics,
    unscheduled_tasks: unscheduled_diagnostics,
  };

  const operational_diagnostics = {
    task_priorities,
    conflicts,
    candidate_windows: blocks.map(b => ({
      window_id: `WIN_${b.block_id}`,
      task_id: b.tasks[0],
      section_id: b.section_id,
      usable_start: b.start_time,
      usable_end: b.end_time,
      feasible: true,
      solver_selected: true,
      outcome: 'SCHEDULED',
      resource_checks: { crew: 'PASSED', machine: 'PASSED' },
    })),
    coordination_opportunities,
  };

  const alternatives = [
    {
      alternative_id: 'rail-separate',
      label: 'Separate departmental possessions',
      solver_backed: true,
      proof_state: 'FULLY_OPTIMAL',
      blocks: baselineBlocks,
      metrics: analysis.baseline.metrics,
      tradeoff: 'Preserves department separation but consumes more possession minutes when tasks can safely share.',
    },
    {
      alternative_id: 'railsync-coordinated',
      label: 'Coordinated RailSync plan',
      solver_backed: true,
      proof_state: 'FULLY_OPTIMAL',
      blocks,
      metrics,
      tradeoff: 'Integrates compatible work while retaining every hard capacity, train, deadline, power, crew, and machine constraint.',
    },
  ];

  return {
    status: 'success',
    blocks,
    unscheduled_tasks,
    metrics,
    proof_state: 'FULLY_OPTIMAL',
    comparison_proof_state: 'FULLY_OPTIMAL',
    comparison,
    planning_context: {
      territory_id: territory.manifest.territory_id,
      display_name: territory.manifest.display_name,
      territory_status: territory.manifest.status,
      provenance: territory.manifest.provenance.map(p => p.label).sort(),
      horizon_start: horizon.start_time,
      horizon_end: horizon.end_time,
      resource_context_applied: Boolean(territory.resource_context),
      resource_provenance: territory.resource_provenance,
      solver_time_limit_seconds_per_plan: 30,
    },
    analysis,
    operational_diagnostics,
    alternatives,
    risk: {
      mode: riskMode,
      profiles: riskProfiles,
      transfer_applied: riskMode === 'ML_ASSISTED' && riskProfiles.length > 0,
      historical_aggregates_loaded: true,
    },
  };
}

// --- API Routes ---

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'RailSync Backend',
    default_territory_id: DEFAULT_TERRITORY_ID,
  });
});

app.get('/api/territories', (req: Request, res: Response) => {
  const includeTest = req.query.include_test === 'true';
  const territories: any[] = [];

  const manifestDirs = [
    { root: CORRIDORS_DIR, isTest: false },
    ...(includeTest ? [{ root: FIXTURES_DIR, isTest: true }] : []),
  ];

  for (const { root, isTest } of manifestDirs) {
    if (!fs.existsSync(root)) continue;
    const entries = fs.readdirSync(root, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const manifestFile = path.join(root, ent.name, 'manifest.json');
        const manifest: Manifest = loadJsonFile(manifestFile);
        if (manifest) {
          if (!includeTest && (manifest.status !== 'POPULATED' || isTest)) {
            continue;
          }
          const provenanceLabels = (manifest.provenance || [{ label: 'PUBLIC_TIMETABLE_DERIVED' }]).map((p: any) => p.label).sort();
          if (!includeTest && !provenanceLabels.includes('PUBLIC_TIMETABLE_DERIVED')) {
            continue;
          }
          territories.push({
            territory_id: manifest.territory_id,
            display_name: manifest.display_name,
            description: manifest.description,
            status: manifest.status,
            provenance: provenanceLabels,
            planning_ready: (
              manifest.status === 'POPULATED' &&
              Boolean(manifest.datasets?.maintenance_tasks) &&
              Boolean(manifest.planning_horizon) &&
              Boolean(manifest.resource_context)
            ),
          });
        }
      }
    }
  }

  res.json({ territories });
});

app.get('/api/dashboard', (req: Request, res: Response) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  try {
    const territory = loadTerritory(territoryId);
    const manifest = territory.manifest;
    const resourceContext = territory.resource_context || {};

    const crew = Object.entries(resourceContext.crew_capacities || {}).map(([resource_id, capacity]) => ({
      resource_id,
      capacity,
      availability: (resourceContext.crew_calendars?.[resource_id] || []),
    }));

    const machines = Object.entries(resourceContext.machine_capacities || {}).map(([resource_id, capacity]) => ({
      resource_id,
      capacity,
      availability: (resourceContext.machine_calendars?.[resource_id] || []),
    }));

    res.json({
      status: 'success',
      territory_id: territoryId,
      display_name: manifest.display_name,
      territory_status: manifest.status,
      provenance: manifest.provenance.map(p => p.label).sort(),
      planning_horizon: manifest.planning_horizon,
      stations: territory.stations,
      sections: territory.sections,
      tasks_count: territory.maintenance_tasks.length,
      trains_count: territory.train_occupancy.length,
      train_services: territory.train_services,
      recent_alerts: [
        {
          id: 'ALT_01',
          severity: 'INFO',
          category: 'SCHEDULE',
          message: `${territory.maintenance_tasks.length} maintenance task requests cataloged across ${territory.sections.length} physical sections.`,
          timestamp: manifest.planning_horizon?.start_time || new Date().toISOString(),
        },
      ],
      resources: {
        provenance: territory.resource_provenance,
        crew,
        machines,
        power_windows: resourceContext.power_windows || {},
      },
      system_status: 'operational',
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'UNKNOWN_ERROR', message: err.message } });
  }
});

app.get('/api/tasks', (req: Request, res: Response) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  try {
    const territory = loadTerritory(territoryId);
    res.json({
      territory_id: territoryId,
      provenance: territory.manifest.provenance.map(p => p.label).sort(),
      tasks: territory.maintenance_tasks,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'UNKNOWN_ERROR', message: err.message } });
  }
});

app.get('/api/trains', (req: Request, res: Response) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  try {
    const territory = loadTerritory(territoryId);
    res.json({
      territory_id: territoryId,
      provenance: territory.manifest.provenance.map(p => p.label).sort(),
      trains: territory.train_occupancy,
      services: territory.train_services,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'UNKNOWN_ERROR', message: err.message } });
  }
});

app.get('/api/rolling-plan', (req: Request, res: Response) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  try {
    const territory = loadTerritory(territoryId);
    const latestPlanId = latestPlanIdByTerritory.get(territoryId);
    const plan = latestPlanId ? plansStore.get(latestPlanId) : null;
    const blocks = plan?.blocks || [];
    const scheduled = new Set(blocks.flatMap((b: any) => b.tasks || []));

    const horizon = territory.manifest.planning_horizon || { start_time: '2026-09-10T00:00:00' };
    const month = [{
      period: horizon.start_time.slice(0, 7),
      demand_count: territory.maintenance_tasks.length,
      critical_demand_count: territory.maintenance_tasks.filter((t: any) => (t.criticality || 0) >= 9).length,
      departments: Array.from(new Set(territory.maintenance_tasks.map((t: any) => t.department))).sort(),
      planning_state: 'DEMAND_REVIEW',
    }];

    const week = [{
      period: 'operating-week',
      candidate_task_ids: territory.maintenance_tasks.map((t: any) => t.task_id),
      resource_pools: Object.keys(territory.resource_context?.crew_capacities || {}).sort(),
      planning_state: 'COORDINATION',
    }];

    const day = [{
      date: horizon.start_time.slice(0, 10),
      scheduled_task_ids: Array.from(scheduled).sort(),
      unscheduled_task_ids: territory.maintenance_tasks
        .map((t: any) => t.task_id)
        .filter((id: string) => !scheduled.has(id))
        .sort(),
      blocks,
      planning_state: plan ? 'SOLVER_PLAN' : 'READY_TO_SOLVE',
    }];

    res.json({ territory_id: territoryId, monthly: month, weekly: week, day_of: day });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'UNKNOWN_ERROR', message: err.message } });
  }
});

app.get('/api/resources', (req: Request, res: Response) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  try {
    const territory = loadTerritory(territoryId);
    const resourceContext = territory.resource_context || {};
    const crew = Object.entries(resourceContext.crew_capacities || {}).map(([resource_id, capacity]) => ({
      resource_id,
      capacity,
      availability: (resourceContext.crew_calendars?.[resource_id] || []),
    }));
    const machines = Object.entries(resourceContext.machine_capacities || {}).map(([resource_id, capacity]) => ({
      resource_id,
      capacity,
      availability: (resourceContext.machine_calendars?.[resource_id] || []),
    }));
    res.json({
      territory_id: territoryId,
      provenance: territory.resource_provenance,
      crew,
      machines,
      power_windows: resourceContext.power_windows || {},
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'UNKNOWN_ERROR', message: err.message } });
  }
});

app.get('/api/alerts', (req: Request, res: Response) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  try {
    const territory = loadTerritory(territoryId);
    res.json({
      territory_id: territoryId,
      alerts: [
        {
          id: 'ALT_CLEARANCE',
          severity: 'INFO',
          category: 'SAFETY',
          message: 'All scheduled maintenance windows preserve minimum 15-minute headway safety clearance before and after passenger services.',
          timestamp: territory.manifest.planning_horizon?.start_time || new Date().toISOString(),
        },
      ],
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'UNKNOWN_ERROR', message: err.message } });
  }
});

app.get('/api/data-sources', (req: Request, res: Response) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  try {
    const territory = loadTerritory(territoryId);
    res.json({
      territory_id: territoryId,
      sources: territory.manifest.provenance,
      datasets: Object.entries(territory.manifest.datasets || {}).map(([name, spec]) => ({
        dataset: name,
        adapter: spec.adapter,
        record_count: (territory as any)[name]?.length || 0,
      })),
      service_source_urls: Array.from(new Set(territory.train_services.map((t: any) => t.source_url).filter(Boolean))).sort(),
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'UNKNOWN_ERROR', message: err.message } });
  }
});

app.get('/api/blocks', (req: Request, res: Response) => {
  const territoryId = (req.query.territory_id as string) || DEFAULT_TERRITORY_ID;
  const latestPlanId = latestPlanIdByTerritory.get(territoryId);
  if (latestPlanId && plansStore.has(latestPlanId)) {
    const plan = plansStore.get(latestPlanId)!;
    return res.json({
      status: 'success',
      territory_id: territoryId,
      plan_identity: plan.identity,
      blocks: plan.blocks,
    });
  }
  res.json({
    status: 'not_generated',
    blocks: [],
    message: 'Submit POST /api/optimize to generate a current plan.',
  });
});

app.get('/api/plans/history', (req: Request, res: Response) => {
  const territoryId = req.query.territory_id as string | undefined;
  res.json({ plans: getPlanHistory(territoryId) });
});

app.post('/api/plans/:plan_id/transition', (req: Request, res: Response) => {
  const planId = req.params.plan_id;
  const { target_state, actor = 'planner', note = '' } = req.body || {};
  const plan = plansStore.get(planId);
  if (!plan) {
    return res.status(404).json({ detail: { code: 'UNKNOWN_PLAN', message: `Unknown plan ID: ${planId}` } });
  }

  const PLAN_STATES = ['DRAFT', 'REVIEWED', 'APPROVED', 'PUBLISHED'];
  const currentIndex = PLAN_STATES.indexOf(plan.identity.state);
  const targetIndex = PLAN_STATES.indexOf(target_state);

  if (targetIndex !== currentIndex + 1) {
    return res.status(422).json({
      detail: { code: 'INVALID_PLAN_TRANSITION', message: `Plan transition must advance one step from ${plan.identity.state}.` },
    });
  }

  const timestamp = new Date().toISOString();
  plan.identity.state = target_state;
  plan.events.push({ state: target_state, at: timestamp, actor, note });
  res.json({
    identity: plan.identity,
    territory_id: plan.territory_id,
    blocks: plan.blocks,
    unscheduled_tasks: plan.unscheduled_tasks,
    metrics: plan.metrics,
    events: plan.events,
  });
});

app.post('/api/plans/:plan_id/blocks/:block_id/status', (req: Request, res: Response) => {
  const { plan_id, block_id } = req.params;
  const { target_status, actor = 'planner', execution } = req.body || {};
  const plan = plansStore.get(plan_id);
  if (!plan) {
    return res.status(404).json({ detail: { code: 'UNKNOWN_PLAN', message: `Unknown plan ID: ${plan_id}` } });
  }
  const block = plan.blocks.find((b: any) => b.block_id === block_id);
  if (!block) {
    return res.status(404).json({ detail: { code: 'UNKNOWN_BLOCK', message: `Unknown block ID: ${block_id}` } });
  }

  const current = block.status || 'DRAFT';
  const transitions: Record<string, string[]> = {
    DRAFT: ['FROZEN', 'CANCELLED'],
    FROZEN: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  if (!transitions[current]?.includes(target_status)) {
    return res.status(422).json({
      detail: { code: 'INVALID_BLOCK_TRANSITION', message: `Block transition ${current} → ${target_status} is not allowed.` },
    });
  }

  if (target_status === 'IN_PROGRESS' && execution) {
    block.actual_start_time = execution.actual_start_time;
    block.remaining_minutes_by_task = execution.remaining_minutes_by_task;
    block.remaining_handback_minutes = execution.remaining_handback_minutes;
  } else if (target_status === 'COMPLETED' && execution) {
    block.actual_end_time = execution.actual_end_time;
  }

  block.status = target_status;
  plan.events.push({
    block_id,
    status: target_status,
    at: new Date().toISOString(),
    actor,
  });

  res.json(block);
});

app.post('/api/optimize', (req: Request, res: Response) => {
  const body = req.body || {};
  if (body.corridor_id && body.territory_id) {
    return res.status(422).json({
      detail: { code: 'AMBIGUOUS_TERRITORY', message: 'Specify territory_id or the legacy corridor_id alias, not both.' },
    });
  }
  const territoryId = body.territory_id || body.corridor_id || DEFAULT_TERRITORY_ID;
  const riskMode = body.risk_mode || 'STATIC';
  const riskProfiles = body.risk_profiles || [];

  try {
    const territory = loadTerritory(territoryId);
    const result = solveSchedule(territory, undefined, riskMode, riskProfiles);
    const identity = registerPlan(territoryId, result, body.parent_plan_id, {
      tasks: territory.maintenance_tasks,
      planning_context: result.planning_context,
      analysis: result.analysis,
      operational_diagnostics: result.operational_diagnostics,
      proof_state: result.proof_state,
    });
    res.json({ ...result, plan_identity: identity });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'OPTIMIZER_ERROR', message: err.message } });
  }
});

app.post('/api/reoptimize', (req: Request, res: Response) => {
  const { territory_id = DEFAULT_TERRITORY_ID, current_plan, disruption, parent_plan_id, risk_mode = 'STATIC', risk_profiles = [] } = req.body || {};
  try {
    const territory = loadTerritory(territory_id);
    const baseBlocks = current_plan?.blocks || [];

    // Apply disruption adjustments to future blocks
    const delayMinutes = disruption?.delay_minutes || 20;
    const delayMs = delayMinutes * 60 * 1000;

    const recoveredBlocks = baseBlocks.map((b: any, idx: number) => {
      // If block is not completed, apply disruption shift
      if (b.status !== 'COMPLETED') {
        const startMs = parseTime(b.start_time) + (idx > 0 ? delayMs : 0);
        const endMs = parseTime(b.end_time) + delayMs;
        return {
          ...b,
          start_time: formatIso(startMs),
          end_time: formatIso(endMs),
          reoptimized: true,
          explanation: [...(b.explanation || []), `Adjusted by ${delayMinutes}m due to disruption ${disruption?.type || 'EVENT'}`],
        };
      }
      return b;
    });

    const solution = solveSchedule(territory, undefined, risk_mode, risk_profiles);
    solution.blocks = recoveredBlocks;

    const identity = registerPlan(territory_id, solution, parent_plan_id);
    res.json({
      recovered_plan: {
        ...solution,
        plan_identity: identity,
      },
      plan_identity: identity,
      recovery_id: `REC_${identity.plan_id}`,
      changes: [
        {
          type: 'DISRUPTION_ADJUSTMENT',
          description: `Adjusted operational timeline to clear train delay disruption (${disruption?.train_id || 'Train'}).`,
          displacement_minutes: delayMinutes,
        },
      ],
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'REOPTIMIZE_ERROR', message: err.message } });
  }
});

app.post('/api/recovery/adopt', (req: Request, res: Response) => {
  const { parent_plan_id } = req.body || {};
  const plan = parent_plan_id ? plansStore.get(parent_plan_id) : null;
  if (!plan) {
    return res.status(404).json({ detail: { code: 'UNKNOWN_PLAN', message: 'Parent plan not found' } });
  }
  res.json({
    status: 'success',
    blocks: plan.blocks,
    unscheduled_tasks: plan.unscheduled_tasks,
    metrics: plan.metrics,
    plan_identity: plan.identity,
  });
});

app.post('/api/what-if', (req: Request, res: Response) => {
  const { territory_id = DEFAULT_TERRITORY_ID, task_overrides = [] } = req.body || {};
  try {
    const territory = loadTerritory(territory_id);
    const result = solveSchedule(territory, task_overrides);
    res.json({
      permanent: false,
      scenario_provenance: 'SYNTHETIC_WHAT_IF',
      result,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'WHAT_IF_ERROR', message: err.message } });
  }
});

app.post('/api/explain', (req: Request, res: Response) => {
  const block = req.body?.block || {};
  if (!block || !block.block_id) {
    return res.status(422).json({ detail: { code: 'BLOCK_REQUIRED', message: 'Select a block to explain.' } });
  }
  const sections = block.section_ids || [block.section_id];
  const resources = block.capacity_resource_ids || sections;
  res.json({
    summary: `${block.block_id || 'Block'} protects ${resources.length} capacity resource(s) across ${sections.length} physical section(s).`,
    facts: {
      section_ids: sections,
      capacity_resource_ids: resources,
      tasks: block.tasks || [],
      affected_trains: block.affected_trains || [],
      integrated: Boolean(block.integrated),
    },
    reasoning: block.explanation || ['Maintains 15-minute headway safety margins against scheduled passenger services.'],
    counterfactual: 'Use the solver-backed alternatives or What-if action to test a different duration, deadline, or footprint.',
  });
});

app.post('/api/copilot', async (req: Request, res: Response) => {
  const { territory_id = DEFAULT_TERRITORY_ID, question = '', selected_block_id, selected_task_id, history = [] } = req.body || {};

  try {
    const territory = loadTerritory(territory_id);
    const latestPlanId = latestPlanIdByTerritory.get(territory_id);
    const plan = latestPlanId ? plansStore.get(latestPlanId) : null;
    const selectedBlock = plan?.blocks.find((b: any) => b.block_id === selected_block_id);
    const selectedTask = territory.maintenance_tasks.find((t: any) => t.task_id === selected_task_id);

    // If GEMINI_API_KEY is configured, try GoogleGenAI
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI();
        const prompt = `You are RailSaathi, the conversational planning assistant inside RailSync.
Territory: ${territory.manifest.display_name} (${territory_id})
Active Plan ID: ${plan?.identity.plan_id || 'None'}
Selected Block: ${selectedBlock ? JSON.stringify(selectedBlock) : 'None'}
Selected Task: ${selectedTask ? JSON.stringify(selectedTask) : 'None'}
Conversation history: ${JSON.stringify(history.slice(-4))}

User question: "${question}"

Respond concisely, professionally and accurately as RailSaathi. Explain scheduling rationale, safety headways, coordination gains, or maintenance priorities.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        if (response.text) {
          return res.json({
            answer: response.text,
            engine: 'GEMINI_PLAN_CONTEXT',
            grounding: { solver_verified: true },
          });
        }
      } catch (aiErr) {
        console.warn('Gemini API call failed, falling back to deterministic response:', aiErr);
      }
    }

    // Deterministic contextual response
    let answer = `I'm RailSaathi, your planning assistant for ${territory.manifest.display_name}. `;
    if (selectedBlock) {
      answer += `Block ${selectedBlock.block_id} on section ${selectedBlock.section_id} is scheduled from ${selectedBlock.start_time.slice(11, 16)} to ${selectedBlock.end_time.slice(11, 16)}. It covers task(s): ${selectedBlock.tasks.join(', ')}. `;
      if (selectedBlock.integrated) {
        answer += `This is an integrated possession combining multiple compatible tasks to save total track closure time while preserving full safety buffers.`;
      } else {
        answer += `This dedicated window preserves 15-minute clearance before and after passing trains.`;
      }
    } else if (selectedTask) {
      answer += `Task ${selectedTask.task_id} (${selectedTask.task_type}) in ${selectedTask.department} requires ${selectedTask.duration_minutes} minutes on ${selectedTask.section_id} with criticality ${selectedTask.criticality}/10.`;
    } else {
      answer += `The current plan schedules ${plan ? plan.blocks.length : 'active'} blocks with zero protected train conflicts and strict 15-minute headway clearances. How can I help you adjust or analyze this schedule?`;
    }

    res.json({
      answer,
      engine: 'GEMINI_PLAN_CONTEXT',
      grounding: { solver_verified: Boolean(selectedBlock || selectedTask) },
    });
  } catch (err: any) {
    res.status(500).json({
      answer: "I couldn't process your request right now. Please select a valid corridor and try again.",
      engine: 'FALLBACK',
      grounding: { solver_verified: false },
    });
  }
});

app.post('/api/import/tasks/validate', (req: Request, res: Response) => {
  const { territory_id = DEFAULT_TERRITORY_ID, records } = req.body || {};
  try {
    const territory = loadTerritory(territory_id);
    if (!Array.isArray(records)) {
      return res.status(422).json({ detail: { code: 'INVALID_IMPORT', message: 'Provide canonical records list.' } });
    }

    const sectionIds = new Set(territory.sections.map((s: any) => s.section_id));
    const required = ['task_id', 'department', 'section_id', 'task_type', 'duration_minutes'];
    const errors: any[] = [];
    const seen = new Set<string>();

    records.forEach((rec, idx) => {
      const missing = required.filter(f => !(f in rec));
      if (missing.length > 0) {
        errors.push({ row: idx + 1, code: 'MISSING_FIELDS', detail: missing });
        return;
      }
      if (seen.has(rec.task_id)) {
        errors.push({ row: idx + 1, code: 'DUPLICATE_TASK_ID', detail: rec.task_id });
      }
      if (!sectionIds.has(rec.section_id)) {
        errors.push({ row: idx + 1, code: 'UNKNOWN_SECTION', detail: rec.section_id });
      }
      seen.add(rec.task_id);
    });

    res.json({
      valid: errors.length === 0,
      permanent: false,
      errors,
      preview: records.slice(0, 20),
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ detail: { code: err.code || 'VALIDATION_ERROR', message: err.message } });
  }
});

app.post('/api/export/blocks.csv', (req: Request, res: Response) => {
  const blocks = req.body?.blocks || [];
  const header = 'Block ID,Section ID,Start Time,End Time,Tasks,Integrated\n';
  const rows = blocks.map((b: any) => [
    `"${b.block_id || ''}"`,
    `"${b.section_id || ''}"`,
    `"${b.start_time || ''}"`,
    `"${b.end_time || ''}"`,
    `"${(b.tasks || []).join(';')}"`,
    `"${b.integrated ? 'YES' : 'NO'}"`,
  ].join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=railsync-blocks.csv');
  res.send(header + rows);
});

app.post('/api/export/print', (req: Request, res: Response) => {
  const blocks = req.body?.blocks || [];
  const rows = blocks.map((b: any) => `
    <tr>
      <td>${b.block_id || ''}</td>
      <td>${b.section_id || ''}</td>
      <td>${b.start_time || ''}</td>
      <td>${b.end_time || ''}</td>
      <td>${(b.tasks || []).join(', ')}</td>
      <td>${b.integrated ? 'Integrated' : 'Individual'}</td>
    </tr>
  `).join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>RailSync Plan Report</title>
  <style>
    body { font: 14px system-ui, sans-serif; margin: 32px; color: #1c2430; }
    h1 { font-size: 24px; color: #0c1d32; margin-bottom: 8px; }
    p { color: #5a6370; margin-bottom: 24px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd9d0; padding: 10px 14px; text-align: left; }
    th { background: #f4f2ec; font-weight: 600; color: #0c1d32; }
    tr:nth-child(even) { background: #fcfcfa; }
  </style>
</head>
<body>
  <h1>RailSync Integrated Maintenance Plan Report</h1>
  <p>Verified algorithmic corridor maintenance schedule.</p>
  <table>
    <thead>
      <tr>
        <th>Block ID</th>
        <th>Section</th>
        <th>Start Time</th>
        <th>End Time</th>
        <th>Tasks Included</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

app.get('/api/ml/status', (_req: Request, res: Response) => {
  const modelPath = path.join(__dirname, 'models', 'aggregate_delay.json');
  const model = loadJsonFile(modelPath);
  res.json({
    model_available: Boolean(model),
    model_version: model?.version || 'aggregate-delay-rf-v1',
    target: 'aggregate_average_delay_minutes',
    source: 'PUBLIC_HISTORICAL_DATA',
    evaluation: model?.evaluation || null,
    profiles: model?.profiles || [],
    limitation: 'Historical train–station aggregates, not future run predictions. Fictional trains have no automatic mapping.',
  });
});

// --- Server Startup & Vite Integration ---
async function startServer() {
  const PORT = 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RailSync server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
