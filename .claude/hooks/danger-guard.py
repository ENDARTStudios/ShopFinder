#!/usr/bin/env python3
"""Danger Guard: previne operações destrutivas."""
import sys

DANGEROUS_COMMANDS = ['git push --force', 'git reset --hard', 'git clean -fd']

def check_command(cmd):
    for dangerous in DANGEROUS_COMMANDS:
        if dangerous in cmd:
            print(f"BLOCKED: Comando perigoso detectado: {dangerous}")
            return False
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: danger-guard.py <comando>")
        sys.exit(1)
    command = " ".join(sys.argv[1:])
    if not check_command(command):
        sys.exit(1)
    print(f"OK: {command}")
