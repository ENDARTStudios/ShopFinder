# AGENT-TOOLBELT — ferramentas de agente avaliadas e adotadas

Resultado da avaliação de 10 ferramentas da comunidade (T071-toolbelt, 11/09/2026).
Critério: utilidade real para o ShopFinder × viabilidade neste ambiente
(Windows + bun + ZCode/Claude Code) × não-duplicação do que já existe.

## Matriz de decisão

| Ferramenta | Função | Decisão | Racional |
|---|---|---|---|
| [Graft CLI](https://github.com/nanonets/graft) | grafo de contexto do código | ✅ **EM PRODUÇÃO** | GRAFT-FIRST (AGENTS.md §Graft). 669 arquivos, 4.492 nós. |
| [browser-use](https://github.com/browser-use/browser-use) | automação de browser | ✅ **EM PRODUÇÃO** | Auditoria visual T069/T071 (IAB passa pelo Vercel Checkpoint, curl não). Plugin ZCode `browser-use`. |
| [diagram-design](https://github.com/cathrynlavery/diagram-design) | skill de diagramas (39 tipos, HTML/SVG editorial) | ✅ **INSTALADA** | `.agents/skills/diagram-design/` (SKILL.md + references + scripts). Útil p/ UML (docs/eng/UML.md), arquitetura, fluxos. |
| [Agent-Reach](https://github.com/Panniantong/Agent-Reach) | acesso agent-friendly à web (Jina Reader, yt-dlp, RSS, gh) | ✅ **INSTALADO** | venv `~/.agent-reach-venv`. `agent-reach doctor` = saúde dos canais. Jina Reader (`r.jina.ai/URL`) contorna bloqueios de bots (ex.: Vercel Checkpoint 429). yt-dlp instalado. |
| [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering) | leitura de referência (harness engineering) | ✅ **REFERÊNCIA** | Lista curada (4.2k★) — ver "Leituras" abaixo. |
| [Strix](https://github.com/usestrix/strix) | agente de pentest autônomo (OWASP Top 10, PoC real) | ⏳ **PREPARADO** | Requer Docker + `LLM_API_KEY`. Uso planejado: `strix --target ./src` + staging (NUNCA sem autorização; é ferramenta de ataque). Ver "Como ativar". |
| [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp) | grafo de código (MCP, 162 linguagens) | ❌ **NÃO ADOTAR** | Overlap total com Graft (mesma função, mesmo fluxo GRAFT-FIRST). Gatilho de revisão: se o monorepo crescer para >5 linguagens não-JS/TS. |
| [agentmemory](https://github.com/rohitg00/agentmemory) | memória persistente MCP | ❌ **NÃO ADOTAR** | A memória nativa de arquivos (MEMORY.md + `/memories/`) cobre o fluxo; exige WSL2/Docker no Windows; 2 sistemas de memória = conflito. |
| [openviking-plugins](https://github.com/Castor6/openviking-plugins) | memória semântica (hooks) | ❌ **NÃO ADOTAR** | Exige chaves Volcengine; overlap com memória nativa. |
| [agency-agents](https://github.com/msitarzewski/agency-agents) | 230+ personas de agente | ❌ **NÃO ADOTAR** (como instalação) | O projeto tem fluxo próprio codificado (Doer → Thinker → Operador, AGENTS.md); 230 personas poluem contexto. Referência futura p/ marketing (Opção B): personas de SEO/growth como *leitura*, não instalação. |
| [scientific-agent-skills](https://github.com/K-Dense-AI/scientific-agent-skills) | 165 skills científicas | ❌ **NÃO ADOTAR** | Fora de domínio (genômica/química…); os mantedores alertam sobre overhead de contexto. Skills genéricas de docs já existem no ZCode. |

## Leituras recomendadas (awesome-harness-engineering)

Práticas que validam/orientam nosso setup: Context Engineering com code-execution
(redução de ~98,7% de tokens), "Token Savior" (grafo de código = nossa escolha
Graft/…-mcp), CLAUDE.md/AGENTS.md como fonte de regras (compaction não preserva),
skillgrade (testar skills em CI), OWASP LLM06 (auditoria de agência excessiva).

## Como ativar o Strix (quando houver LLM_API_KEY)

```bash
curl -sSL https://strix.ai/install | bash
export STRIX_LLM="openrouter/z-ai/glm-5.3"   # ou outro provider
export LLM_API_KEY="<key>"
strix --target ./src        # somente leitura+código
strix -t https://staging... # staging NUNCA produção sem autorização expressa
```

## Manutenção

- Reavaliar a matriz a cada trimestre ou quando uma ferramenta criar fricção.
- `agent-reach doctor` antes de pesquisas web importantes.
- `graft build` após refactors; `graft check` para frescura.
