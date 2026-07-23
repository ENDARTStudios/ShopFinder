#!/usr/bin/env python3
"""Valida commits convencionais."""
import sys, re

PATTERN = r'^(feat|fix|docs|chore|refactor|test|style|perf)(\(.+\))?:\s.+'

def validate(msg):
    return bool(re.match(PATTERN, msg.strip()))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: conventional-commit-guard.py <mensagem>")
        sys.exit(1)
    msg = " ".join(sys.argv[1:])
    if validate(msg):
        print(f"OK: {msg}")
    else:
        print(f"INVALIDO: {msg} - Use formato convencional")
        sys.exit(1)
