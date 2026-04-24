# Handoff: grading.com — Home Page

## Overview

**grading.com** é uma biblioteca de Color Grading cinematográfico em português. Este pacote contém o design de referência da **home page** — uma página longa, dark, com hero cinematográfico, grade de LUTs e preview do LUT Studio. A inspiração visual é **motionvfx.com** (dark, tipografia grande, grids de frames) combinada com micro-animações de parallax/zoom no scroll estilo Apple.

## About the Design Files

Os arquivos deste bundle são **referências de design criadas em HTML** — um protótipo funcional mostrando a aparência e o comportamento pretendidos, **não código de produção pra copiar direto**. A tarefa é **recriar este design no ambiente/codebase de destino** (Next.js, Astro, SvelteKit, Vite+React, etc.) usando os padrões e bibliotecas estabelecidos do projeto. Se não houver codebase ainda, escolha o framework mais apropriado (recomendação: **Next.js 14 App Router** ou **Astro** pra uma landing page estática com boa performance).

O protótipo usa **Babel em tempo real no navegador** pra transformar JSX — isso funciona como demo, mas **não deve ir pra produção assim**. Em produção, pré-compile o JSX (Vite, esbuild, etc).

## Fidelity

**High-fidelity (hifi)**. O protótipo tem cores finais, tipografia final, spacing final e as interações de scroll definidas. Recrie pixel-perfect usando os componentes do codebase de destino.

## Stack do protótipo

- React 18.3.1 (UMD, via CDN)
- Babel Standalone 7.29.0 (JSX in-browser — **apenas pra demo**)
- CSS puro em `styles.css`
- Google Fonts: Inter Tight, Inter, JetBrains Mono, Instrument Serif
- Sem build step, sem dependências npm

## Design Tokens

### Cores

```
--bg:          #0a0a0a   /* fundo principal */
--bg-2:        #111111   /* fundo secundário (seção Studio) */
--bg-3:        #161616   /* fundo terciário */
--ink:         #f2f0eb   /* texto principal (off-white quente) */
--ink-dim:     rgba(242, 240, 235, 0.62)  /* texto secundário */
--ink-mute:    rgba(242, 240, 235, 0.38)  /* texto terciário / labels */
--line:        rgba(242, 240, 235, 0.10)  /* divisores */
--line-strong: rgba(242, 240, 235, 0.22)  /* bordas de botões */

/* Accents — mesmo chroma e lightness em oklch, só varia o hue */
--teal:   oklch(0.74 0.11 200)
--orange: oklch(0.74 0.14 50)
--accent: var(--orange)  /* default */

/* Accents alternativos (via Tweaks) */
crimson:  oklch(0.68 0.16 18)
lime:     oklch(0.82 0.14 128)
```

### Tipografia

```
--display: "Inter Tight", Inter, system-ui, sans-serif
            font-weight: 500/600, letter-spacing: -0.03em, line-height: 0.95

--text:    "Inter", system-ui, sans-serif
            font-weight: 400/450/500, line-height: 1.5

--mono:    "JetBrains Mono", ui-monospace, monospace
            font-size: 10-11px, letter-spacing: 0.06-0.18em, text-transform: uppercase

--serif:   "Instrument Serif"  /* usado em palavras com destaque itálico */
            font-weight: 400, italic
```

**Escalas de título:**
- Hero title: `clamp(56px, 9.5vw, 148px)`
- Section title: `clamp(40px, 5.5vw, 80px)`
- CTA title: `clamp(48px, 7vw, 112px)`
- Sub / lede: `clamp(16px, 1.4vw, 19px)`

### Spacing

- Container max-width: `1440px`
- Padding lateral: `32px` (desktop), `20px` (mobile)
- Seções: padding vertical `140px` desktop, `100px` mobile
- Gap da grid de LUTs: `32px` (regular), `16px` (compact), `48px` (comfy)

### Radius & motion

- Border radius: `6px` (frames), `8px` (cards), `10-12px` (containers grandes), `999px` (pills/botões)
- Transições: `cubic-bezier(0.2, 0.8, 0.2, 1)` a `0.2s-0.9s`
- Reveal on scroll: `opacity 0→1`, `translateY 28px→0`, `0.9s`
- Parallax: `scale 1 → 1.14` baseado na posição no viewport

## Screens / Views

A home é uma **página longa única** composta pelas seções abaixo, nesta ordem:

### 1. Nav (fixo, backdrop blur)
- Altura ~60px, padding lateral 32px
- Brand (esquerda): quadrado 22px com gradiente teal→orange + wordmark "grading.com" (o "." em cor accent)
- Links (centro): LUTs, Studio, Compatibilidade, Sobre
- CTA (direita): "Explorar biblioteca" — pill branca fundo `--ink`, texto `--bg`
- Ao rolar >20px: fundo `rgba(10,10,10,0.82)` + border-bottom `--line`

### 2. Hero (min-height 100vh)
- Eyebrow: `● Biblioteca de Color Grading · v3.2` (mono, uppercase)
- Título: "O cinema **começa** na cor." — "começa" em serif itálica cor `--accent`
- Subtítulo: ~620px de largura, cor `--ink-dim`, texto sobre LUTs + Studio + receitas
- 2 botões: primário branco ("Ver biblioteca" com seta) + ghost ("Abrir Studio")
- **Strip de 5 frames cinematográficos** (grid 5 colunas) com parallax:
  - Frames das pontas rotacionados `rotateX(8deg)` + `translateY(40px)`
  - Frame central com `scale(1.06)` e `z-index: 2`
  - Looks: Teal×Orange, Kodak 5219, Neon Noir, Pastel Symmetry, Moonlit Blue
- Glow de fundo: radial-gradient teal + orange, blur 40px, opacity 0.55

### 3. What is grading.com (`.what`)
- Grid 2 colunas (1fr 1fr) com gap 80px
- Esquerda: eyebrow, título "Uma ponte entre *o seu frame* e o cinema.", 2 parágrafos, 3 stats (420+ LUTs, 3 editores, ∞ looks)
- Direita: visual 4:5 com **split view** original/graded (clip-path inset), handle vertical branco no meio com círculo, labels "ORIGINAL" / "GRADED" nos cantos superiores

### 4. LUTs (`.luts`, id="luts")
- Section head centralizada: eyebrow "Biblioteca", título "Doze **atmosferas**. Infinitos filmes.", lede
- Filtros (pills mono): Todos / Cinema clássico / Contemporâneo / Ação / Drama / Neon — ativo fica fundo branco
- **Grid 3 colunas** de cards 4:5 (gap 32px, ajustável via density)
- Cada card tem:
  - Frame cinematográfico full-bleed (gradient + grain + vignette + letterbox bars)
  - Overlay gradient bottom→top 75% preto
  - Meta bottom-left: título (Inter Tight 20px) + subtítulo (mono, categoria)
  - Pill bottom-right: código do LUT (ex: "LUT · 03")
  - Hover: frame-inner scale 1.1 → 1.18 em 0.8s
- 12 cards com os looks: Bay Orange, Pastel Symmetry, Neon Noir, Desert Warm, Kodak 5219, Cyber Rain, Bleach Bypass, Moonlit Blue, Crimson Night, Golden Hour, Forest Mist, Silver Halide
- Footer: botão ghost "Ver todos os 420 LUTs →"

### 5. Studio (`.studio`, id="studio", bg `--bg-2`)
- Header 2 colunas: eyebrow+título esquerda / lede direita
- **Demo grid**: preview 16:10 (esquerda) + sidebar 320px (direita)
- Preview:
  - Label top-left "GRADED · SPLIT VIEW"
  - 3 dots top-right (primeiro laranja)
  - Split view original/graded com handle central branco (círculo 44px com ↔)
- Sidebar (bg `#0b0b0b`, border-left `--line`, padding 24px):
  - "Parâmetros de cor" + 5 sliders (Temperatura, Tint, Saturação, Contraste, Exposição)
    - Label esquerda + valor numérico direita (mono, cor `--accent`)
    - Barra de track 2px `--line` + fill `--accent` + knob circular 10px branco
  - "Receita FCP": path "Aplicar LUT → Efeitos de Cor → LUT Personalizado" (mono, `→` em cor accent)
  - Metadata "meu-grade.cube · Intensidade 100%"
  - Botão "Baixar .cube" full-width branco

### 6. Compatibilidade (`.compat`, centralizado)
- Título mono pequeno: "Compatível com os principais editores"
- Row de 5 wordmarks: Final Cut Pro, DaVinci Resolve, Premiere Pro, After Effects, CapCut
- Fonte Inter Tight 22px, cor `--ink-dim`, opacity 0.85, gap 56px

### 7. CTA final (`.cta`)
- Glow radial de fundo (cor accent, blur 50px)
- Eyebrow + título grande "Seu próximo **filme** começa aqui." (filme em serif itálica accent)
- 2 botões: primário "Explorar biblioteca" + ghost "Abrir Studio"

### 8. Footer
- Border-top `--line`, padding 48px/32px
- Esquerda: "© 2026 grading.com · Biblioteca de Color Grading" (mono)
- Direita: links Licença, Docs, Blog, Contato

## Cinematic Frame Placeholders

**Importante**: os "frames de filmes" **não são stills reais** de filmes (copyright). São placeholders estilizados representando **moods de color grading**:

```js
// components.jsx — objeto LOOKS
tealOrange:      linear-gradient 135deg, #0a2a38 → #1a4a5e → #d97543 → #f2b278
desertWarm:      linear-gradient 180deg, #2a1a10 → #8b4a1f → #e8a457 → #f5d28e
neonNoir:        linear-gradient 135deg, #0a0020 → #2a0048 → #8a1a6a → #ff3b82
pastelSymmetry:  linear-gradient 180deg, #f4c6a0 → #e89a6a → #d4746a → #a05a72
bleachBypass:    linear-gradient 180deg, #d8d4c8 → #948c7e → #4a4638 → #1a1814
kodakWarm:       linear-gradient 135deg, #1a0e08 → #5c3418 → #b87a3a → #f0c878
greenMist:       linear-gradient 180deg, #0a1a12 → #1e4028 → #5a8458 → #a8c098
cyberRain:       linear-gradient 135deg, #050818 → #0a2448 → #1a6ab8 → #5ac8f0
sovietGray:      linear-gradient 180deg, #2a2a2e → #4a4a50 → #8a8a8e → #b8b8b8
goldenHour:      linear-gradient 180deg, #1a0608 → #6a1a18 → #d06a1a → #f5d078
moonlitBlue:     linear-gradient 180deg, #050818 → #0a1e3a → #1a4a7e → #6a8ab8
crimsonNight:    linear-gradient 135deg, #0a0508 → #2a080e → #8a1a2a → #d83a4a
flatLog:         linear-gradient 180deg, #2a2824 → #484540 → #68645c → #807c74
```

Cada frame tem:
- `.frame-gradient` (o look)
- `.frame-grain` (SVG noise, opacity 0.12, mix-blend-mode overlay)
- `.frame-vignette` (radial gradient)
- `.frame-bars` opcional (letterbox 6% preto top/bottom)
- `.frame-label` com tags mono

Quando você conseguir licenciar stills reais, substitua os gradients por `<img>` mantendo os overlays de vignette/grain/label.

## Interactions & Behavior

### Scroll reveals
- Componente `<Reveal>` usa `IntersectionObserver` (threshold 0.15, rootMargin `0px 0px -60px 0px`)
- Ao entrar na viewport: `.reveal` ganha classe `.in` → opacity 0→1 + translateY 28px→0
- Delays escalonados (80, 140, 200, 220ms) dentro de seções pra criar stagger

### Parallax (Apple-style)
- Hook `useParallax(ref, { zoom, translate, axis })`
- Calcula progresso do elemento no viewport (-1 abaixo / 0 centro / +1 acima)
- Aplica `scale(1 + zoom * (1 - dist))` + `translateY` via `transform`
- Usado em: hero-strip (translate 60px, zoom 0), what-visual (zoom 0.08), cada lut-card (zoom 0.14), studio-preview (zoom 0.06)
- Respeita toggle "animações" — `body.no-motion` anula transitions e transforms

### Hover states
- `.lut-card:hover .frame-inner` → `scale(1.18)` em 0.8s
- `.btn-primary:hover` → `translateY(-1px)`
- `.btn-ghost:hover` → border-color `--ink`
- `.nav-links a:hover` → color `--ink`

### Filtros de LUTs
- Estado React `filter` (default "Todos")
- Ao clicar num pill, filtra o array `cards` por `.cat`

### Nav scroll state
- Estado React `scrolled` atualizado por scroll listener
- `>20px` → `.nav.scrolled` (adiciona background mais opaco + border)

## State Management

Estado local por componente (useState). Nenhum store global necessário.

- `Nav`: `scrolled: boolean`
- `Luts`: `filter: string`
- `App`: tweaks (accent, typePair, density, animations) via `useTweaks()` — pode ser removido em produção

## Tweaks (protótipo apenas)

O painel de Tweaks (`tweaks-panel.jsx`) é infraestrutura do ambiente de prototipagem e **não deve ir pra produção**. Ele expõe:
- `accent`: orange (default) | teal | crimson | lime
- `typePair`: inter-tight (default) | serif | mono
- `density`: compact | regular (default) | comfy
- `animations`: boolean (default true)

Em produção, **remova o `<TweaksPanel>` e o `useTweaks`** e fixe os valores finais (provavelmente: orange / inter-tight / comfy / animations on).

## Responsive

Breakpoints:
- `≤ 980px`: hero strip vira 3 colunas (último 2 escondem), what-grid vira 1 coluna, luts-grid 2 cols, studio-demo vira 1 coluna, nav-links escondem (implementar menu mobile)
- `≤ 640px`: hero strip some, luts-grid 1 coluna, section padding reduz

**Falta implementar:** menu mobile (hamburger → drawer/overlay). O protótipo omite isso.

## Files

```
index.html         — Shell da página (carrega React/Babel, inicializa App)
styles.css         — Todo o CSS (tokens, layout, componentes)
components.jsx     — CinemaFrame, LOOKS, Reveal, useParallax
sections.jsx       — Nav, Hero, What, Luts, Studio, Compat, Cta, Footer
tweaks-panel.jsx   — Infra de Tweaks (remover em produção)
```

## Recomendações de portabilidade

### Se for Next.js App Router:
- Cada seção vira um componente em `components/sections/`
- Mova os tokens do `:root` pra `app/globals.css` (ou `tailwind.config` se usar Tailwind)
- Substitua `useParallax` por Framer Motion `useScroll` + `useTransform`
- Substitua `Reveal` por Framer Motion `whileInView`
- Use `next/font` pra carregar Inter Tight / JetBrains Mono / Instrument Serif (melhor CLS que Google Fonts via `<link>`)

### Se for Astro:
- Mantenha as seções como `.astro` estático
- Islands de interatividade: Nav (scroll state), Luts (filtros), Studio (split-view se virar interativo)
- Use `astro:assets` pros stills quando forem licenciados

### Em qualquer caso:
- Pré-compile o JSX (não use Babel no navegador)
- Otimize as fontes (subset, preload, `font-display: swap`)
- Adicione meta tags OG/Twitter pra share
- Adicione favicon + Apple touch icon derivados do quadrado com gradiente do logo
- Adicione analytics (Plausible/Umami recomendado pra landing pages)
- Se usar hero-strip com stills reais, use `loading="eager"` + `fetchpriority="high"` no frame central

## Assets

**Nenhum asset binário** — tudo é CSS gradient + SVG inline (noise). Quando for licenciar stills reais de filmes, colocar em `public/stills/` e substituir gradients por `<img>` mantendo overlays.

## Fonts licensing

- **Inter Tight, Inter** — SIL Open Font License (OK pra uso comercial)
- **JetBrains Mono** — Apache 2.0 (OK)
- **Instrument Serif** — SIL OFL (OK)

Todas grátis via Google Fonts. Pra melhor performance em produção, self-host usando `fontsource` ou `next/font`.
