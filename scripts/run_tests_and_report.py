import subprocess, sys, json, os

report_path = os.path.join(os.getcwd(), '_test_report.json')

r = subprocess.run(
    [sys.executable, '-m', 'unittest', 'tests.test_protocolo_integrity', '-v'],
    capture_output=True, text=True, cwd=os.getcwd(), timeout=30
)

passed = r.returncode == 0

report = {
    'exit_code': r.returncode,
    'passed': passed,
    'stdout': r.stdout,
    'stderr': r.stderr,
    'tests_ok': [],
    'tests_fail': []
}

for line in r.stdout.split('\n'):
    if line.startswith('test_'):
        if '... ok' in line:
            report['tests_ok'].append(line.split()[0])
        elif '... FAIL' in line or '... ERROR' in line:
            report['tests_fail'].append(line)

for line in r.stderr.split('\n'):
    if 'FAIL:' in line or 'ERROR:' in line:
        report['tests_fail'].append(line.strip())

# Extrai summary
for line in r.stdout.split('\n'):
    if line.startswith('Ran ') and 'tests in' in line:
        report['summary_line'] = line.strip()
    if line.strip() in ('OK', 'FAILED (errors=1)', 'FAILED (failures=1)'):
        report['result_line'] = line.strip()

with open(report_path, 'w', encoding='utf-8') as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(f'RESULT: {"PASSED" if passed else "FAILED"} (exit {r.returncode})')
print(f'Tests OK: {len(report["tests_ok"])}, Tests FAIL: {len(report["tests_fail"])}')