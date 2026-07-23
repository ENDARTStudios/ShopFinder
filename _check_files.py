import os, json

files = [
    'PROTOCOLO_MESTRE.md', 'PROMPT_MESTRE_AUTONOMO.md', 'PLANO_MESTRE.md',
    'DECISOES.md', 'PENDENCIAS_OPERADOR.md', 'MANUAL_DO_OPERADOR.md',
    '.gitignore', '.env.example',
    '.claude/schemas/tarefa.schema.json', '.claude/schemas/status.schema.json',
    '.claude/schemas/review.schema.json', '.claude/schemas/erro_taxonomy.json',
    '.claude/hooks/danger-guard.py', '.claude/hooks/conventional-commit-guard.py',
    '.claude/settings.json', '.pre-commit-config.yaml',
    '.github/dependabot.yml', '.github/workflows/ci.yml',
    'tests/test_protocolo_integrity.py'
]

results = {}
for f in files:
    exists = os.path.isfile(f)
    results[f] = 'OK' if exists else 'MISSING'
    print(f, '->', 'OK' if exists else 'MISSING')

missing = [f for f, v in results.items() if v == 'MISSING']
print()
print(f'TOTAL: {len(files)}, OK: {len(files)-len(missing)}, MISSING: {len(missing)}')