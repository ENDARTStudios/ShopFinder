/**
 * T099 — Limpeza semanal de deployments Vercel (automação DESTRUTIVA gateada).
 * Ratificação: RATIFICO-T099 (Operador, 14/set/2026) — ver DECISOES.md.
 *
 * Comportamento: resolve o deployment de PRODUÇÃO ANTES de qualquer delete;
 * keep-set = produção + 3 deployments mais recentes (por createdAt, excluindo
 * a própria produção); todo o resto é deletado. Fail-closed em todas as
 * portas: sem produção resolvida NADA é deletado.
 *
 * Env:
 *   VERCEL_TOKEN  (obrigatório) — token com escopo no projeto shop-finder
 *   DRY_RUN       ("true" default) — lista o que SERIA deletado, não deleta
 *   PROJECT_NAME  (default "shop-finder")
 *   TEAM_ID       (opcional — necessário se o token não for escopado ao projeto)
 *
 * Exit codes:
 *   0 — sucesso (dry-run ou deletions completos)
 *   2 — VERCEL_TOKEN ausente ou rejeitado pela API
 *   3 — produção não resolvida (fail-closed: zero deletes)
 *   4 — erro/throttle durante a sequência de deletes (contagem parcial logada)
 *   5 — falha ao resolver projeto ou listar deployments
 *
 * Logs: somente uids/urls/contagens. O token NUNCA é logado.
 */

// top-level await exige módulo (TS1375 em arquivo sem import/export).
export {};

const TOKEN = process.env.VERCEL_TOKEN ?? "";
const DRY_RUN = (process.env.DRY_RUN ?? "true") === "true";
const PROJECT_NAME = process.env.PROJECT_NAME ?? "shop-finder";
const TEAM_ID = process.env.TEAM_ID ?? "";
const BASE = "https://api.vercel.com";
const DELETE_PAUSE_MS = 1500;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const teamQ = TEAM_ID ? `teamId=${TEAM_ID}&` : "";

function authHeaders(): HeadersInit {
  return { authorization: `Bearer ${TOKEN}` };
}

function ageDays(createdAt: number): string {
  return ((Date.now() - createdAt) / 86_400_000).toFixed(1);
}

interface VercelDeployment {
  uid: string;
  url: string;
  createdAt: number;
  target?: string | null;
  state?: string;
}

async function main(): Promise<number> {
  if (!TOKEN) {
    console.error("[cleanup] VERCEL_TOKEN ausente — abortando (fail-closed).");
    return 2;
  }

  // 1. Identidade: /v2/user valida tokens de conta; tokens ESCOPADOS AO PROJETO
  // respondem 404 aqui (não acessam endpoint de conta) — nesse caso a identidade
  // é provada pela resolução do projeto no passo 2. 401/403 → token rejeitado.
  const userRes = await fetch(`${BASE}/v2/user`, { headers: authHeaders() });
  if (userRes.ok) {
    const user = (await userRes.json()) as { user?: { username?: string } };
    console.log(`[cleanup] auth ok (usuário: ${user.user?.username ?? "?"})`);
  } else if (userRes.status !== 404) {
    console.error(
      `[cleanup] auth rejeitada (/v2/user HTTP ${userRes.status}) — abortando (exit 2).`
    );
    return 2;
  } else {
    console.log("[cleanup] token escopado ao projeto (sem acesso a /v2/user) — seguindo.");
  }

  // 2. Resolver projeto
  const projRes = await fetch(`${BASE}/v9/projects/${PROJECT_NAME}?${teamQ}`, {
    headers: authHeaders()
  });
  if (!projRes.ok) {
    console.error(`[cleanup] projeto "${PROJECT_NAME}" não resolvido (HTTP ${projRes.status}) — exit 5.`);
    return 5;
  }
  const project = (await projRes.json()) as { id?: string };
  const projectId = project.id;
  if (!projectId) {
    console.error("[cleanup] projeto sem id — exit 5.");
    return 5;
  }

  // 3. Produção PRIMEIRO — sem ela, nada é deletado (fail-closed)
  const prodRes = await fetch(
    `${BASE}/v6/deployments?${teamQ}projectId=${projectId}&target=production&limit=1`,
    { headers: authHeaders() }
  );
  if (!prodRes.ok) {
    console.error(`[cleanup] listagem de produção falhou (HTTP ${prodRes.status}) — exit 3 (zero deletes).`);
    return 3;
  }
  const prodData = (await prodRes.json()) as { deployments?: VercelDeployment[] };
  const production = prodData.deployments?.[0];
  if (!production?.uid) {
    console.error("[cleanup] PRODUÇÃO NÃO RESOLVIDA — exit 3 (zero deletes).");
    return 3;
  }
  console.log(`[cleanup] produção atual: ${production.uid} (${production.url})`);

  // 4. Listar TUDO com paginação completa (until = cursor mais antigo)
  const all = new Map<string, VercelDeployment>();
  let until: string | undefined;
  for (let page = 0; page < 50; page++) {
    const untilQ = until ? `&until=${until}` : "";
    const res = await fetch(
      `${BASE}/v6/deployments?${teamQ}projectId=${projectId}&limit=100${untilQ}`,
      { headers: authHeaders() }
    );
    if (!res.ok) {
      console.error(`[cleanup] listagem falhou na página ${page + 1} (HTTP ${res.status}) — exit 5.`);
      return 5;
    }
    const data = (await res.json()) as {
      deployments?: VercelDeployment[];
      pagination?: { next?: number };
    };
    const pageItems = data.deployments ?? [];
    for (const d of pageItems) all.set(d.uid, d);
    const next = data.pagination?.next;
    if (!next || pageItems.length === 0) break;
    until = String(next);
  }
  console.log(`[cleanup] total listado: ${all.size} deployments`);

  // 5. Keep-set: produção + 3 mais recentes (excluindo a própria produção)
  const sorted = [...all.values()].sort((a, b) => b.createdAt - a.createdAt);
  const keep = new Set<string>([production.uid]);
  for (const d of sorted) {
    if (keep.size >= 4) break;
    keep.add(d.uid);
  }
  console.log(`[cleanup] keep-set (${keep.size}):`);
  for (const uid of keep) {
    const d = all.get(uid);
    if (d) console.log(`  KEEP ${uid} (${d.url}) [${d.target ?? "preview"}] ${ageDays(d.createdAt)}d`);
  }

  const toDelete = sorted.filter((d) => !keep.has(d.uid));
  console.log(`[cleanup] a deletar: ${toDelete.length} | DRY_RUN=${DRY_RUN}`);

  if (DRY_RUN) {
    for (const d of toDelete) {
      console.log(`  DRY ${d.uid} (${d.url}) [${d.target ?? "preview"}] ${ageDays(d.createdAt)}d`);
    }
    console.log("0 deletions (dry-run)");
    return 0;
  }

  // 6. Deletes sequenciais com pausa; throttle/erro → abort com contagem parcial
  let deleted = 0;
  for (const d of toDelete) {
    const res = await fetch(`${BASE}/v13/deployments/${d.uid}?${teamQ}`, {
      method: "DELETE",
      headers: authHeaders()
    });
    if (!res.ok) {
      console.error(
        `[cleanup] DELETE falhou em ${d.uid} (HTTP ${res.status}) após ${deleted} deletes — exit 4.`
      );
      return 4;
    }
    deleted++;
    console.log(`  DEL ${d.uid} (${d.url}) [${deleted}/${toDelete.length}]`);
    await sleep(DELETE_PAUSE_MS);
  }

  console.log(`[cleanup] concluído: ${deleted} deletados, keep-set de ${keep.size} preservado.`);
  return 0;
}

process.exit(await main());
