#!/usr/bin/env python3
"""
Gera o sync simbiotico a partir dos arquivos-fonte de estado.
Sync é um JSON que consolida: tarefa atual, últimas ações, arquivos modificados e pendências.
"""
import json, os, glob
from datetime import datetime

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def ler_arquivo(path):
    try:
        with open(path, encoding='utf-8') as f:
            return f.read()
    except Exception:
        return None

def listar_modificados():
    """Lista arquivos .py, .json, .md modificados nas últimas 24h."""
    agora = datetime.now().timestamp()
    resultado = []
    for ext in ('*.py', '*.json', '*.md', '*.yml', '*.yaml'):
        for f in glob.glob(os.path.join(BASE, '**', ext), recursive=True):
            if '.git' in f or 'node_modules' in f or '__pycache__' in f:
                continue
            try:
                mtime = os.path.getmtime(f)
                if agora - mtime < 86400:
                    resultado.append(os.path.relpath(f, BASE))
            except Exception:
                continue
    return resultado[:20]

def gerar_sync():
    plano = ler_arquivo(os.path.join(BASE, 'PLANO_MESTRE.md'))
    protocolo = ler_arquivo(os.path.join(BASE, 'PROTOCOLO_MESTRE.md'))
    decisoes = ler_arquivo(os.path.join(BASE, 'DECISOES.md'))
    pendencia = ler_arquivo(os.path.join(BASE, 'PENDENCIAS_OPERADOR.md'))

    sync = {
        'gerado_em': datetime.now().isoformat(),
        'estado': {
            'plano_mestre': bool(plano),
            'protocolo': bool(protocolo),
            'decisoes': bool(decisoes),
            'pendencias_operador': bool(pendencia)
        },
        'arquivos_modificados_recentes': listar_modificados(),
        'resumo': {
            'plano_tamanho': len(plano) if plano else 0,
            'protocolo_tamanho': len(protocolo) if protocolo else 0,
            'decisoes_tamanho': len(decisoes) if decisoes else 0,
            'pendencia_tamanho': len(pendencia) if pendencia else 0
        },
        'status': 'ok'
    }
    return sync

if __name__ == '__main__':
    sync = gerar_sync()
    print(json.dumps(sync, indent=2, ensure_ascii=False))