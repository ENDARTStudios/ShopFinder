# Frontend Design — Direção Visual e Stack de UI/UX

## 1. Ordem do processo de design

1. **Direção visual** — identidade: e-commerce de hardware tech; modo dark-first; precisão técnica.
2. **Tipografia** — sans geométrica para UI (ex. Inter/Geist), monospace para SKUs/preços técnicos; escala 1.25 (12/14/16/20/25/31).
3. **Composição** — grid 12 colunas, produto em destaque 2/3 + specs 1/3; espaçamento em escala de 4px.
4. **Hierarquia** — preço e CTA dominam; specs secundárias; fornecedor invisível.
5. **Identidade** — ver `docs/brand-system.md`; accent único + neutros.

## 2. Stack técnica

| Camada | Ferramenta |
|---|---|
| Base | Next.js 16 App Router, React 19, Tailwind 4, shadcn/radix |
| Motion | Framer Motion (padrão), GSAP (hero/landing), Anime.js (casos pontuais) — ver `MOTION-SYSTEM.md` |
| 3D/WebGL | Three.js + React Three Fiber — hero de landing com renderização de produto 3D (lazy, só quando visível, fallback estático) |
| Padrões UI | Referência: 21st.dev, Kokonut UI, Bklit UI, React Bits, Aceternity, Componentry, Refero — sempre adaptados aos tokens |
| Estado | Zustand (cart), TanStack Query (server state) |
| Formulários | react-hook-form + zod |
| Charts | Recharts |

### Regra WebGL
Só carregar R3F/Three via `next/dynamic` + `IntersectionObserver`; bundle de 3D nunca no caminho crítico do produto; `prefers-reduced-motion` → versão estática.

## 3. UX guidelines mínimos
- Todo clique tem feedback < 150ms (ripple/scale/toast).
- Carrinho sempre acessível (drawer), estado persistente.
- Preço em BRL sempre com fonte da cotação visível (tooltip).
- Erros com ação recuperável ("tentar de novo"), nunca dead-ends.
- Acessibilidade: WCAG 2.1 AA, foco visível, navegação por teclado no drawer/modal.
