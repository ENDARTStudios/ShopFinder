# Script de auditoria read-only - T010-real-state-audit
# Todas as saídas vão para tool-results/audit_output.txt

$outFile = "tool-results/audit_output.txt"
"=== AUDIT LOG $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ===" | Out-File -FilePath $outFile -Encoding UTF8

# 1. git remote -v
"`n=== 1. GIT REMOTE -V ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
$remote = git remote -v 2>&1
$remote = $remote -replace 'ghp_[A-Za-z0-9]+', 'ghp_REDACTED'
$remote | Out-File -FilePath $outFile -Encoding UTF8 -Append

# 2. git fetch origin
"`n=== 2. GIT FETCH ORIGIN ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
git fetch origin 2>&1 | Out-File -FilePath $outFile -Encoding UTF8 -Append

# 3. git rev-parse HEAD
"`n=== 3. HEAD LOCAL (rev-parse HEAD) ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
$headLocal = git rev-parse HEAD 2>&1
$headLocal | Out-File -FilePath $outFile -Encoding UTF8 -Append

# 4. git rev-parse origin/main
"`n=== 4. ORIGIN/MAIN (rev-parse origin/main) ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
$headRemote = git rev-parse origin/main 2>&1
$headRemote | Out-File -FilePath $outFile -Encoding UTF8 -Append

# 5. git status -sb
"`n=== 5. GIT STATUS -SB ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
git status -sb 2>&1 | Out-File -FilePath $outFile -Encoding UTF8 -Append

# 6. git log --oneline -10 (local)
"`n=== 6. GIT LOG --ONELINE (LOCAL, últimos 10) ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
git log --oneline -10 2>&1 | Out-File -FilePath $outFile -Encoding UTF8 -Append

# 7. git log --oneline --left-right HEAD...origin/main
"`n=== 7. DIVERGÊNCIA LOCAL vs REMOTO ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
git log --oneline --left-right HEAD...origin/main 2>&1 | Out-File -FilePath $outFile -Encoding UTF8 -Append

# 8. head -3 DECISOES.md
"`n=== 8. DECISOES.md (primeiras 3 linhas) ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
Get-Content DECISOES.md -TotalCount 3 2>&1 | Out-File -FilePath $outFile -Encoding UTF8 -Append

# 9. head -3 PLANO_MESTRE.md
"`n=== 9. PLANO_MESTRE.md (primeiras 3 linhas) ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
Get-Content PLANO_MESTRE.md -TotalCount 3 2>&1 | Out-File -FilePath $outFile -Encoding UTF8 -Append

# 10. git ls-tree HEAD (inventário local)
"`n=== 10. INVENTÁRIO LOCAL ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
$arquivos = @(
    "PROTOCOLO_MESTRE.md", "PLANO_MESTRE.md", "DECISOES.md", "PENDENCIAS_OPERADOR.md",
    ".claude/schemas/tarefa.schema.json", ".claude/schemas/status.schema.json",
    ".claude/schemas/review.schema.json", ".claude/schemas/erro_taxonomy.json",
    ".claude/hooks/danger-guard.py", ".claude/hooks/conventional-commit-guard.py",
    ".claude/settings.json", ".pre-commit-config.yaml",
    ".github/workflows/ci.yml", ".github/dependabot.yml",
    "tests/test_protocolo_integrity.py", "src/lib/redis.ts",
    "src/app/api/health/route.ts", "prisma/schema.prisma",
    "package.json"
)
foreach ($arq in $arquivos) {
    if (Test-Path $arq) {
        "PRESENTE: $arq" | Out-File -FilePath $outFile -Encoding UTF8 -Append
    } else {
        "AUSENTE: $arq" | Out-File -FilePath $outFile -Encoding UTF8 -Append
    }
}

# 11. git show origin/main (inventário remoto)
"`n=== 11. INVENTÁRIO REMOTO (git show origin/main:) ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
foreach ($arq in $arquivos) {
    $result = git show "origin/main:$arq" 2>&1
    if ($LASTEXITCODE -eq 0) {
        "PRESENTE: $arq" | Out-File -FilePath $outFile -Encoding UTF8 -Append
    } else {
        "AUSENTE: $arq" | Out-File -FilePath $outFile -Encoding UTF8 -Append
    }
}

# 12. .env.example check
"`n=== 12. .ENV.EXAMPLE - string de conexão (PRESENTE/AUSENTE, NUNCA valor) ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
if (Test-Path ".env.example") {
    $envContent = Get-Content ".env.example" -Raw
    if ($envContent -match "postgresql://" -or $envContent -match "DATABASE_URL") {
        "PRESENTE: .env.example contém DATABASE_URL ou postgresql://" | Out-File -FilePath $outFile -Encoding UTF8 -Append
    } else {
        "AUSENTE: .env.example NÃO contém DATABASE_URL ou postgresql://" | Out-File -FilePath $outFile -Encoding UTF8 -Append
    }
} else {
    "AUSENTE: .env.example não existe" | Out-File -FilePath $outFile -Encoding UTF8 -Append
}

# 13. curl /api/catalog
"`n=== 13. ENDPOINT PÚBLICO /api/catalog ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
try {
    $httpCode = (Invoke-WebRequest -Uri "https://shop-finder-taupe.vercel.app/api/catalog" -UseBasicParsing -TimeoutSec 15).StatusCode
    "HTTP Status: $httpCode" | Out-File -FilePath $outFile -Encoding UTF8 -Append
    $response = Invoke-WebRequest -Uri "https://shop-finder-taupe.vercel.app/api/catalog" -UseBasicParsing -TimeoutSec 15
    $content = $response.Content
    if ($content.Length -gt 400) {
        $content = $content.Substring(0, 400)
    }
    "`nResponse (primeiros 400 chars):" | Out-File -FilePath $outFile -Encoding UTF8 -Append
    $content | Out-File -FilePath $outFile -Encoding UTF8 -Append
} catch {
    "ERRO: $_" | Out-File -FilePath $outFile -Encoding UTF8 -Append
}

# 14. Teste de integridade
"`n=== 14. TESTE DE INTEGRIDADE (test_protocolo_integrity.py) ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
$pythonCheck = Get-Command python3 -ErrorAction SilentlyContinue
if (-not $pythonCheck) {
    $pythonCheck = Get-Command python -ErrorAction SilentlyContinue
}
if ($pythonCheck) {
    $pythonPath = $pythonCheck.Source
    "Python found at: $pythonPath" | Out-File -FilePath $outFile -Encoding UTF8 -Append
    & $pythonPath -m unittest discover -s tests -p test_protocolo_integrity.py 2>&1 | Out-File -FilePath $outFile -Encoding UTF8 -Append
} else {
    "TOOL_MISSING: python3/python não encontrado no PATH" | Out-File -FilePath $outFile -Encoding UTF8 -Append
}

# 15. git status --short final
"`n=== 15. GIT STATUS --SHORT FINAL ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
git status --short 2>&1 | Out-File -FilePath $outFile -Encoding UTF8 -Append

"`n=== FIM DO AUDIT LOG ===" | Out-File -FilePath $outFile -Encoding UTF8 -Append
Write-Host "Audit complete. Output written to $outFile"