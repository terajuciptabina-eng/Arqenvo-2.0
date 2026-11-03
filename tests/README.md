# Test strategy

Tests will be introduced alongside the first executable prototype.

Required layers:
- Unit tests for pure domain and geometry adapter logic.
- Kernel contract tests shared by every candidate adapter.
- Geometry regression tests with fixed reference inputs and tolerances.
- Domain tests for element relationships and dependency updates.
- Interaction tests for tool state machines.
- End-to-end browser tests for desktop and mobile workflows.
- iPad Safari validation for touch and memory-sensitive workflows.

Every accepted Archicad reference scenario should map to at least one ARQENVO test case where automation is practical. Manual-only tests must include a reproducible checklist and evidence.
