from typing import List, Optional, Dict, Any, Literal, Union, Annotated
from pydantic import BaseModel, Field, ConfigDict

class MaintenanceTask(BaseModel):
    task_id: str
    department: str
    section_id: str
    task_type: str
    duration_minutes: int
    criticality: int
    urgency: int
    overdue_days: int
    deadline: str
    requires_power_block: bool
    crew_type: str
    compatibility_group: str
    section_ids: Optional[List[str]] = None
    capacity_resource_ids: Optional[List[str]] = None
    machine_type: Optional[str] = None
    preferred_window: Optional[str] = None
    power_isolation_zone_id: Optional[str] = None

class TrainOccupancy(BaseModel):
    train_id: str
    section_id: str
    entry_time: str
    exit_time: str
    direction: Optional[str] = None
    traffic_type: Optional[str] = None
    capacity_resource_ids: Optional[List[str]] = None

class ScheduledBlock(BaseModel):
    block_id: str
    section_id: str
    start_time: str
    end_time: str
    tasks: List[str]
    integrated: bool
    affected_trains: List[str] = Field(default_factory=list)
    explanation: List[str] = Field(default_factory=list)
    footprint_id: Optional[str] = None
    section_ids: Optional[List[str]] = None
    capacity_resource_ids: Optional[List[str]] = None
    track_ids: List[str] = Field(default_factory=list)
    power_isolation_zone_id: Optional[str] = None
    status: Literal["DRAFT", "FROZEN", "PLANNED", "APPROVED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] = "DRAFT"
    locked: bool = False
    actual_start_time: Optional[str] = None
    actual_end_time: Optional[str] = None
    remaining_minutes_by_task: Optional[Dict[str, int]] = None
    remaining_handback_minutes: Optional[int] = None

class OptimizeMetrics(BaseModel):
    baseline_block_hours: float
    optimized_block_hours: float
    baseline_affected_trains: int
    optimized_affected_trains: int
    integrated_blocks: int

class RiskProfileBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    train_id: str
    section_id: str
    historical_train_id: str
    historical_station_id: str


class OptimizeRequest(BaseModel):
    profile: Optional[str] = "Availability First"
    territory_id: Optional[str] = None
    corridor_id: Optional[str] = None
    horizon_hours: Optional[int] = Field(default=None, gt=0)
    risk_mode: Literal["STATIC", "ML_ASSISTED"] = "STATIC"
    risk_profiles: List[RiskProfileBinding] = Field(default_factory=list, max_length=100)

class TrainDelayScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["TRAIN_DELAY"]
    train_id: str = Field(min_length=1)
    delay_minutes: int = Field(ge=0, le=1440, strict=True)
    effective_time: Optional[str] = None


class TrainDelaysScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["TRAIN_DELAYS"]
    delays: List[TrainDelayScenario] = Field(min_length=1, max_length=50)
    effective_time: Optional[str] = None


class CrewUnavailableScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["CREW_UNAVAILABLE"]
    crew_type: str
    event_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    effective_time: Optional[str] = None


class MachineUnavailableScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["MACHINE_UNAVAILABLE"]
    machine_type: str
    event_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    effective_time: Optional[str] = None


class PowerCancelledScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["POWER_ISOLATION_CANCELLED"]
    section_ids: List[str] = Field(min_length=1)
    event_id: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    effective_time: Optional[str] = None


class SectionUnavailableScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["SECTION_UNAVAILABLE"]
    section_id: str
    start_time: str
    end_time: str
    capacity_resource_ids: List[str] = Field(default_factory=list)
    effective_time: Optional[str] = None


class EmergencyWorkScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["EMERGENCY_WORK"]
    task: MaintenanceTask
    effective_time: Optional[str] = None


class WeatherRestrictionScenario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["WEATHER_RESTRICTION"]
    delay_minutes: int = Field(ge=0, le=1440, strict=True)
    train_ids: List[str] = Field(default_factory=list)
    effective_time: Optional[str] = None


DisruptionScenario = Annotated[
    Union[
        TrainDelayScenario,
        TrainDelaysScenario,
        CrewUnavailableScenario,
        MachineUnavailableScenario,
        PowerCancelledScenario,
        SectionUnavailableScenario,
        EmergencyWorkScenario,
        WeatherRestrictionScenario,
    ],
    Field(discriminator="type"),
]


class CurrentPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    blocks: List[ScheduledBlock] = Field(max_length=500)
    unscheduled_tasks: List[str]


class ReoptimizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    territory_id: str
    horizon_start: str
    horizon_end: str
    current_plan: CurrentPlan
    parent_plan_id: Optional[str] = None
    snapshot_as_of: Optional[str] = None
    disruption: DisruptionScenario
    risk_mode: Literal["STATIC", "ML_ASSISTED"] = "STATIC"
    risk_profiles: List[RiskProfileBinding] = Field(default_factory=list, max_length=100)


class ComparisonSummary(BaseModel):
    baseline_label: str
    same_task_set: bool
    closure_saved_minutes: Optional[int] = None
    closure_reduction_percent: Optional[float] = None
    baseline_proof_state: str
    optimized_proof_state: str


class PlanningContext(BaseModel):
    territory_id: str
    display_name: str
    territory_status: str
    provenance: List[str]
    horizon_start: str
    horizon_end: str
    resource_context_applied: bool
    resource_provenance: Optional[str] = None
    solver_time_limit_seconds_per_plan: float
    public_data_notice: str = "Timetable-derived public data; not a live operational feed."
    prototype_data_notice: str = "Maintenance demand, resources, and scenarios are synthetic prototype inputs."


class PlanIdentity(BaseModel):
    plan_id: str
    version: int
    state: Literal["DRAFT", "REVIEWED", "APPROVED", "PUBLISHED"]
    created_at: str
    parent_plan_id: Optional[str] = None


class AnalysisPlanMetrics(BaseModel):
    scheduled_task_count: int
    unscheduled_task_count: int
    productive_minutes: int
    possession_minutes: int
    block_count: int
    integrated_blocks: int
    criticality_served: int
    urgency_served: int
    overdue_days_served: int
    maintenance_delivery_efficiency: Optional[float] = None
    minimum_boundary_slack_minutes: int
    total_boundary_slack_minutes: int


class AnalysisPlan(BaseModel):
    blocks: List[ScheduledBlock]
    scheduled_task_ids: List[str]
    unscheduled_task_ids: List[str]
    proof_state: str
    metrics: AnalysisPlanMetrics


class FairnessAnalysis(BaseModel):
    baseline_label: str
    same_task_set: bool
    possession_saved_minutes: Optional[int] = None
    possession_reduction_percent: Optional[float] = None
    statement: str


class AnalysisTaskDetail(BaseModel):
    task_id: str
    task_type: str
    department: str
    section_id: str
    criticality: int
    urgency: int
    overdue_days: int
    crew_type: Optional[str] = None
    machine_type: Optional[str] = None
    requires_power_block: bool
    reservation_minutes: int
    deadline_check: str
    resource_checks: Dict[str, str]


class BlockFeasibility(BaseModel):
    section_match: str
    duration_fit: str
    train_conflict: str
    candidate_window: str


class BlockIntegration(BaseModel):
    integrated: bool
    sharing_status: str
    compatibility_status: str
    reason_codes: List[str]


class BlockRobustness(BaseModel):
    before_boundary_slack_minutes: int
    after_boundary_slack_minutes: int
    minimum_boundary_slack_minutes: int


class BlockDiagnostic(BaseModel):
    block_id: str
    section_id: str
    window_id: Optional[str] = None
    feasibility: BlockFeasibility
    integration: BlockIntegration
    robustness: Optional[BlockRobustness] = None
    tasks: List[AnalysisTaskDetail]


class IntegratedBlockGain(BaseModel):
    block_id: str
    section_id: str
    task_ids: List[str]
    departments: List[str]
    individual_reservation_minutes: int
    shared_possession_minutes: int
    coordination_gain_minutes: int


class CandidateWindowDiagnostic(BaseModel):
    task_id: str
    window_id: str
    feasible: bool
    reasons: List[str]
    resource_checks: Dict[str, str]


class UnscheduledTaskDiagnostic(BaseModel):
    task: AnalysisTaskDetail
    outcome: str
    reason_codes: List[str]
    candidate_windows: List[CandidateWindowDiagnostic]


class OptimizeAnalysis(BaseModel):
    fairness: FairnessAnalysis
    baseline: AnalysisPlan
    railsync: AnalysisPlan
    integrated_blocks: List[IntegratedBlockGain]
    block_diagnostics: List[BlockDiagnostic]
    unscheduled_tasks: List[UnscheduledTaskDiagnostic]


class TaskPriorityDiagnostic(BaseModel):
    task_id: str
    task_type: str
    department: str
    section_id: str
    criticality: int
    urgency: int
    overdue_days: int
    deadline: str
    category: Literal["CRITICAL", "HIGH", "MEDIUM", "ROUTINE"]
    solver_outcome: str
    priority_score: int
    priority_band: Literal["CRITICAL", "HIGH", "MEDIUM", "ROUTINE"]
    factor_breakdown: Dict[str, int]
    human_readable_explanation: str


class OperationalConflictDiagnostic(BaseModel):
    conflict_id: str
    task_id: str
    train_id: str
    section_id: str
    train_entry_time: str
    train_exit_time: str
    protected_start: str
    protected_end: str
    train_occupancy_minutes: int
    protected_interval_minutes: int
    minimum_clearance_minutes: int
    reason_code: Literal["TRAIN_OCCUPANCY_SAFETY_EXCLUSION"]
    severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]


class OperationalCandidateWindow(BaseModel):
    task_id: str
    window_id: str
    section_id: str
    footprint_id: Optional[str] = None
    section_ids: List[str]
    capacity_resource_ids: List[str]
    nominal_start: str
    nominal_end: str
    usable_start: str
    usable_end: str
    nominal_minutes: int
    usable_minutes: int
    margin_before_minutes: int
    margin_after_minutes: int
    feasible: bool
    reasons: List[str]
    resource_checks: Dict[str, str]
    solver_selected: bool
    outcome: str


class CoordinationOpportunity(BaseModel):
    opportunity_id: str
    task_ids: List[str]
    section_id: str
    footprint_id: Optional[str] = None
    departments: List[str]
    compatibility_status: Literal["COMPATIBLE", "CONDITIONAL"]
    reason_codes: List[str]
    solver_selected_together: bool


class OperationalDiagnostics(BaseModel):
    task_priorities: List[TaskPriorityDiagnostic]
    conflicts: List[OperationalConflictDiagnostic]
    candidate_windows: List[OperationalCandidateWindow]
    coordination_opportunities: List[CoordinationOpportunity]


class OptimizeResponse(BaseModel):
    status: str
    blocks: List[ScheduledBlock]
    unscheduled_tasks: List[str]
    metrics: OptimizeMetrics
    proof_state: str
    comparison_proof_state: str
    comparison: ComparisonSummary
    planning_context: PlanningContext
    analysis: OptimizeAnalysis
    operational_diagnostics: OperationalDiagnostics
    risk: Dict[str, Any] = Field(default_factory=dict)
    plan_identity: PlanIdentity
    alternatives: List[Dict[str, Any]] = Field(default_factory=list)


class RecoveryMetrics(BaseModel):
    retained_blocks: int
    shifted_blocks: int
    cancelled_blocks: int
    deferred_blocks: int = 0
    new_blocks: int
    retained_tasks: int
    shifted_tasks: int
    new_tasks: int
    unscheduled_tasks_after_disruption: int
    total_shift_minutes: int
    total_block_shift_minutes: int


class RecoveredPlan(BaseModel):
    status: str
    blocks: List[ScheduledBlock]
    unscheduled_tasks: List[str]
    metrics: OptimizeMetrics
    proof_state: str
    service_metrics: AnalysisPlanMetrics
    block_diagnostics: List[BlockDiagnostic]
    unscheduled_diagnostics: List[UnscheduledTaskDiagnostic]


class ReoptimizeResponse(BaseModel):
    status: str
    recovery_id: str
    territory_id: str
    horizon_start: str
    horizon_end: str
    disruption: DisruptionScenario
    scenario_provenance: str
    base_plan: CurrentPlan
    recovered_plan: RecoveredPlan
    recovery_metrics: RecoveryMetrics
    block_changes: List[Dict[str, Any]]
    task_changes: List[Dict[str, Any]]
    newly_unscheduled_task_ids: List[str]
    invalidated_blocks: List[Dict[str, Any]]
    affected_sections: List[str]
    train_occupancy: List[TrainOccupancy]
    risk: Dict[str, Any]
    immutable_task_ids: List[str] = Field(default_factory=list)
    escalation_required: bool = False
    selected_tier: Optional[str] = None
    recovery_attempts: List[Dict[str, Any]] = Field(default_factory=list)


class RecoveryAdoptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recovery_id: str = Field(min_length=1)
    parent_plan_id: Optional[str] = None
