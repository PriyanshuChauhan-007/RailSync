# RailSync UI Reference Audit

This note records the interface patterns already selected for the SIH finalization. It is a bounded design synthesis, not a claim that RailSync reproduces an official railway control system.

## Patterns retained

- **Operational control views:** keep corridor topology and time visible, use compact train identifiers, and reserve status colour for operational meaning.
- **Maintenance planning tools:** pair a filterable work queue with explicit priority inputs, resource checks, lifecycle state, and drill-down evidence.
- **Optimization products:** show the chain from input demand to exclusions, candidate windows, solver selection, and coordinated output; do not present an unexplained final score.
- **Recovery workflows:** preserve a visible current-plan → disruption → recovered-plan sequence and require an explicit adoption action.
- **Decision assistants:** bind explanations to the selected task, block, window, conflict, and registered plan version; the assistant never changes solver facts.

## RailSync applications

| Reference mechanism | RailSync implementation | Reason |
| --- | --- | --- |
| Persistent linear topology | Corridor schematic and time–distance view | A route-time diagram communicates this linear railway problem more directly than a decorative geographic map. |
| Evidence before outcome | Train traffic → maintenance demand → conflict → CP-SAT windows → coordinated plan | Judges can follow why a possession is feasible instead of trusting an opaque result. |
| Selected-object inspector | Priority & Feasibility and Why this possession? | Keeps detailed evidence contextual without overwhelming the full work queue. |
| Status-aware workflow | Draft/review/approval lifecycle and explicit recovery adoption | Separates preview, review, and applied state. |
| Progressive disclosure | Advanced ML, imports, provenance, and technical diagnostics | Keeps experimental or specialist controls available without making them the primary path. |

## Explicit exclusions

- No invented live feed, geographic control map, signalling state, or official approval workflow.
- No decorative 3D railway scene or WebGL visualization.
- No fabricated risk score or AI-selected schedule.
- Fixed landing examples are labelled as illustrative and are not presented as active-session results.
