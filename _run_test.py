import subprocess, json, sys

r = subprocess.run(
    [sys.executable, '-m', 'unittest', 'tests.test_protocolo_integrity', '-v'],
    capture_output=True, text=True,
    cwd='d:/PROJETOS/ShopFinder/ShopFinder',
    timeout=20
)

result = {
    'exit_code': r.returncode,
    'stdout': r.stdout,
    'stderr': r.stderr,
    'tests_run': 0,
    'failures': 0,
    'errors': 0,
    'summary': ''
}

# Parse summary line
for line in r.stdout.split('\n'):
    if line.startswith('Ran ') and ' test' in line:
        result['tests_run'] = int(line.split()[1])
    if line.startswith('FAILED'):
        result['failures'] = 1
    if line.startswith('ERROR'):
        result['errors'] = 1

result['summary'] = 'PASSED' if r.returncode == 0 else 'FAILED'

# Write using only stdout (reliable output)
print('===RESULT===')
print(json.dumps(result))
print('===END===')