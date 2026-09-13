# Motion System — Skeletons, Lazy Loading e Animações

Baseado na skill **motion-design** (princípios: github.com/kylezantos/design-principles). Regras obrigatórias para **toda** interface do ShopFinder.

## 1. Identidade de motion (Brand Motion Identity)

| Constante | Valor |
|---|---|
| **Archetype** | Corporate (UI) / Premium (landing & produto) |
| **Signature easing** | `cubic-bezier(0.2, 0, 0, 1)` (Material 3) para 80% dos casos |
| **Duration palette** | quick 150ms · standard 250ms · slow 400ms |
| **Entrance pattern** | fade + translateY(12px→0), ease-out, uma direção consistente (de baixo) |

```css
/* globals.css — tokens */
:root {
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.05, 0.7, 0.1, 1);   /* entrada: decelera */
  --ease-exit: cubic-bezier(0.3, 0, 1, 1);          /* saída: acelera */
  --dur-quick: 150ms; --dur-standard: 250ms; --dur-slow: 400ms;
}
```

## 2. Regras críticas (nunca violar)

1. **Nunca `linear`** para movimento espacial (linear só spinner/progresso).
2. **Nunca só opacity** em mudança de estado importante — combinar com position/scale.
3. Entrada 30–50% mais longa que saída.
4. **3 camadas** em cenas hero: primária + secundária (sombra/ícone) + ambiente (gradiente sutil).
5. **Regra 1/3**: máx. 1/3 dos elementos em movimento simultâneo; stagger total < 500ms.
6. `prefers-reduced-motion: reduce` → desligar transformações, manter fades ≤ 100ms.

## 3. Durações por elemento

| Elemento | Duração | Easing |
|---|---|---|
| Tooltip / micro-feedback | 80–120ms | ease-out |
| Botão (press) | 120–180ms (scale 0.97) | ease-out |
| Card enter/exit | 200–350ms | enter ease-out, exit ease-in |
| Modal/drawer (cart) | 300–400ms | spring suave |
| Transição de página | 400–600ms | ease-out |
| Error shake | 300–400ms, ±10px, 2–3 oscilações | ease-in-out |

## 4. Skeletons (obrigatórios em toda rota assíncrona)

- **ProductCard skeleton**: bloco de imagem 4:3 + 2 linhas de texto + linha de preço, shimmer `animate-pulse` com gradiente 1.2s.
- **Página de produto**: skeleton de galeria + specs em `<Suspense>` com `loading.tsx` por rota.
- **Tabela compare**: skeleton de colunas mantendo larguras estáveis (evita layout shift).
- **Admin/pipeline**: skeleton de cards de status.
- Sempre mesmo layout do conteúdo final (mesma altura/largura) — CLS = 0.

## 5. Lazy loading

- `next/dynamic` com `loading: () => <Skeleton/>` para: painel de knowledge IA, cart drawer contents pesados, charts (recharts), compare table.
- Imagens: `next/image` com `placeholder="empty"` + fade-in 200ms on load.
- Stagger de grids: micro cascade 30ms/item, total < 400ms.

## 6. Padrões framer-motion (lib já instalada — passar a usar)

```tsx
// Entrada padrão de card
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -8, transition: { duration: 0.15, ease: [0.3, 0, 1, 1] } }}
  transition={{ duration: 0.25, ease: [0.05, 0.7, 0.1, 1] }}
/>
```

Checklist de PR (adicionado ao template): todo carregamento tem skeleton; toda entrada/saída tem easing direcional; press feedback em botões; `prefers-reduced-motion` respeitado.

## 7. Bibliotecas de UI/motion permitidas

Framer Motion (padrão), GSAP (apenas hero/landing com timelines complexas), React Bits / Aceternity / 21st.dev como referência de padrões — adaptados aos tokens acima, nunca copiados com timing próprio.
