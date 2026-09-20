from difflib import unified_diff
from pathlib import Path
import subprocess
root = Path.cwd()
tracked = [
    'optimizer/optimizer.py','optimizer/possessions.py','optimizer/recovery.py','optimizer/resources.py',
    'optimizer/test_integration.py','backend/main.py','backend/operations_service.py',
    'backend/recovery_service.py','backend/schemas.py','backend/test_recovery_api.py','backend/test_v2_api.py',
]
new = [
    'optimizer/recovery_validation.py','optimizer/test_recovery_validation.py',
    'optimizer/test_recovery_execution.py','backend/test_recovery_versioning.py',
    'optimizer/test_restricted_recovery.py','optimizer/recovery_graph.py',
    'optimizer/test_recovery_graph.py','optimizer/test_recovery_escalation.py',
    'optimizer/golden_recovery.py','optimizer/test_golden_recovery.py',
    'optimizer/benchmark_golden_recovery.py','scripts/build_golden_fixtures.py',
    'scripts/verify_golden_fixture_constants.py','scripts/render_golden_recovery_evidence.py',
    'docs/GOLDEN_RECOVERY_SUITE.md',
]
new += [str(p.relative_to(root)).replace('\\','/') for p in (root/'optimizer/fixtures/golden_recovery').glob('*.json')]
patch = subprocess.run(['git','diff','--',*tracked],cwd=root,capture_output=True,check=True).stdout.decode('utf-8')
for name in new:
    lines = (root/name).read_text(encoding='utf-8').splitlines(keepends=True)
    patch += f'diff --git a/{name} b/{name}\nnew file mode 100644\n'
    patch += ''.join(unified_diff([],lines,fromfile='/dev/null',tofile=f'b/{name}'))
out = root/'artifacts/implementation-checkpoints/gates-3-9-working-tree.patch'
out.write_text(patch,encoding='utf-8')
print(out, out.stat().st_size, len(new))
