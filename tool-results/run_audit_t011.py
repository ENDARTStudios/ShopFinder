#!/usr/bin/env python3
"""T011 — Auditoria de confirmação: produção vs local, divergência git, .gitignore."""
import subprocess, os, json, sys
from pathlib import Path

OUT = Path("tool-results/audit_t011_output.txt")

def log(msg):
    with open(OUT, "a", encoding="utf-8") as f:
        f.write(msg + "\n")
    print(msg)

def run(cmd, label, max_lines=0):
    log(f"\n=== {label} ===")
    log(f"$ {cmd}")
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        out = (r.stdout + r.stderr).strip()
        if max_lines > 0:
            lines = out.split("\n")
            out = "\n".join(lines[:max_lines])
        log(out if out else "(vazio)")
        if r.returncode != 0:
            log(f"[exit code: {r.returncode}]")
        return out
    except Exception as e:
        log(f"[ERRO: {e}]")
        return ""

def main():
    # Reset output
    if OUT.exists():
        OUT.unlink()
    
    log(f"# T011-confirm-prod-git-ignore — {__import__('datetime').datetime.now().isoformat()}")
    log("# Modo LEITURA. Nenhuma alteração em código/governança/histórico.\n")
    
    # ── 1. PRODUÇÃO /api/catalog ──
    log("## 1. PRODUÇÃO: /api/catalog")
    run("curl -s -o /dev/null -w '%{http_code}\\n' https://shop-finder-taupe.vercel.app/api/catalog",
        "HTTP Status Code (produção)")
    run("curl -s https://shop-finder-taupe.vercel.app/api/catalog | head -c 800",
        "Corpo (primeiros 800 bytes)")
    
    # ── 2. LOCAL /api/catalog ──
    log("\n## 2. LOCAL: /api/catalog (http://localhost:3301)")
    run("curl -s -o /dev/null -w '%{http_code}\\n' --connect-timeout 5 http://localhost:3301/api/catalog",
        "HTTP Status Code (local)")
    run("curl -s --connect-timeout 5 http://localhost:3301/api/catalog | head -c 800",
        "Corpo (primeiros 800 bytes)")
    
    # ── 3. DIVERGÊNCIA GIT ──
    log("\n## 3. DIVERGÊNCIA GIT")
    run("git fetch origin", "git fetch origin")
    run("git rev-parse HEAD", "HEAD local")
    run("git rev-parse origin/main", "origin/main")
    run("git status -sb", "git status -sb")
    run("git log --oneline --left-right -8 HEAD...origin/main",
        "Divergência (HEAD...origin/main, 8 commits)")
    
    # ── 4. .GITIGNORE ──
    log("\n## 4. .GITIGNORE — arquivos de governança")
    run("git check-ignore -v .claude/schemas/tarefa.schema.json",
        "check-ignore .claude/schemas/tarefa.schema.json")
    run("git check-ignore -v .github/dependabot.yml",
        "check-ignore .github/dependabot.yml")
    run("git ls-files .claude .github/dependabot.yml",
        "ls-files (tracked)")
    run("git check-ignore -v state/",
        "check-ignore state/ (para confirmar se state/ é ignorado)")
    
    # ── 5. RAINHAS (draft files) ──
    log("\n## 5. RAINHAS: rascunhos de sessão")
    run("git status --short", "git status --short (final)")
    
    log("\n# FIM")
    print(f"\nSaída completa salva em {OUT}")

if __name__ == "__main__":
    main()