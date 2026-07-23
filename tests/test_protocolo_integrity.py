import unittest, json, os

REQUIRED_FILES = [
    'PROTOCOLO_MESTRE.md', 'PROMPT_MESTRE_AUTONOMO.md', 'PLANO_MESTRE.md',
    'DECISOES.md', 'PENDENCIAS_OPERADOR.md', 'MANUAL_DO_OPERADOR.md',
    '.gitignore', '.env.example', '.claude/schemas/tarefa.schema.json',
    '.claude/schemas/status.schema.json', '.claude/schemas/review.schema.json',
    '.claude/schemas/erro_taxonomy.json', '.claude/hooks/danger-guard.py',
    '.claude/hooks/conventional-commit-guard.py', '.claude/settings.json',
    '.pre-commit-config.yaml', '.github/dependabot.yml',
    '.github/workflows/ci.yml', 'tests/test_protocolo_integrity.py'
]

class TestProtocolIntegrity(unittest.TestCase):
    def test_required_files_exist(self):
        for f in REQUIRED_FILES:
            self.assertTrue(os.path.isfile(f), f'{f} não encontrado')
    
    def test_json_schemas_valid(self):
        for schema in ['.claude/schemas/tarefa.schema.json', '.claude/schemas/status.schema.json', 
                       '.claude/schemas/review.schema.json', '.claude/schemas/erro_taxonomy.json']:
            with open(schema) as f:
                data = json.load(f)
            self.assertIsInstance(data, dict)
    
    def test_hooks_executable(self):
        for hook in ['.claude/hooks/danger-guard.py', '.claude/hooks/conventional-commit-guard.py']:
            self.assertTrue(os.access(hook, os.X_OK), f'{hook} não executável')
    
    def test_ci_exists(self):
        self.assertTrue(os.path.isfile('.github/workflows/ci.yml'))
    
    def test_dependabot_exists(self):
        self.assertTrue(os.path.isfile('.github/dependabot.yml'))
    
    def test_precommit_has_gitleaks(self):
        with open('.pre-commit-config.yaml') as f:
            content = f.read()
        self.assertIn('gitleaks', content)
    
    def test_gitignore_entries(self):
        with open('.gitignore') as f:
            content = f.read()
        self.assertIn('.env', content)
    
    def test_env_example_placeholders(self):
        with open('.env.example') as f:
            content = f.read()
        self.assertNotIn('ghp_', content)
    
    def test_settings_registers_hooks(self):
        with open('.claude/settings.json') as f:
            data = json.load(f)
        self.assertIn('hooks', data)
    
    def test_prompt_contract(self):
        self.assertTrue(os.path.isfile('PROMPT_MESTRE_AUTONOMO.md'))
    
    def test_protocol_error_codes(self):
        codes = ['DEP_MISSING', 'API_UNAVAILABLE', 'SCHEMA_MISMATCH', 'UNKNOWN']
        if os.path.isfile('PROTOCOLO_MESTRE.md'):
            with open('PROTOCOLO_MESTRE.md') as f:
                content = f.read()
            for code in codes:
                self.assertIn(code, content)

if __name__ == '__main__':
    unittest.main()
