# Design: PWA iOS — Add to Home Screen + Responsividade Mobile

**Date:** 2026-03-21
**Status:** Approved

## Problema

O Clarita já tem PWA parcialmente configurado (manifest, service worker, meta tags Apple), mas faltam os assets reais e ajustes de layout que tornam a experiência no iPhone idêntica a um app nativo.

## Objetivo

Permitir que pacientes adicionem o Clarita à home screen do iPhone com ícone correto, splash screen e layout responsivo — sem necessidade de conta Apple Developer ou App Store.

## Fora do Escopo

- App Store (sem conta Apple Developer)
- Capacitor / sideload
- Android (já funciona melhor com PWA)

---

## Design

### Seção 1 — Ícones e Manifest

**Assets a gerar** (via script Node.js com `sharp`, a partir de `public/logo-clarita.svg`):

| Arquivo | Dimensão | Uso |
|---|---|---|
| `public/icon-192.png` | 192×192 | Manifest PWA |
| `public/icon-512.png` | 512×512 | Manifest PWA + maskable |
| `public/apple-touch-icon.png` | 180×180 | Home screen iOS |

**`layout.tsx`** — adicionar:
```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

**`manifest.json`** — atualizar:
- `start_url`: `/patient-home` (mais relevante para pacientes)
- Garantir `purpose: "maskable"` no ícone 512

### Seção 2 — Splash Screens iOS + Viewport

**Viewport** — atualizar em `layout.tsx`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

**Splash screens** (geradas via script `scripts/generate-pwa-assets.mjs`):

| Arquivo | Resolução | Dispositivo |
|---|---|---|
| `public/splash/splash-2796x1290.png` | 2796×1290 | iPhone 14/15 Pro Max |
| `public/splash/splash-2556x1179.png` | 2556×1179 | iPhone 15 Pro |
| `public/splash/splash-2532x1170.png` | 2532×1170 | iPhone 14/15 |
| `public/splash/splash-1334x750.png` | 1334×750 | iPhone SE |

Geradas com fundo `#f0fdf4` (verde claro Clarita) e logo centralizado.

**Link tags no `layout.tsx`**:
```html
<link rel="apple-touch-startup-image"
  href="/splash/splash-2796x1290.png"
  media="(device-width: 430px) and (-webkit-device-pixel-ratio: 3)" />
<link rel="apple-touch-startup-image"
  href="/splash/splash-2556x1179.png"
  media="(device-width: 393px) and (-webkit-device-pixel-ratio: 3)" />
<link rel="apple-touch-startup-image"
  href="/splash/splash-2532x1170.png"
  media="(device-width: 390px) and (-webkit-device-pixel-ratio: 3)" />
<link rel="apple-touch-startup-image"
  href="/splash/splash-1334x750.png"
  media="(device-width: 375px) and (-webkit-device-pixel-ratio: 2)" />
```

### Seção 3 — Responsividade Mobile + Safe Area

**`globals.css`** — safe area para notch e home indicator:
```css
body {
  padding-bottom: env(safe-area-inset-bottom);
  padding-top: env(safe-area-inset-top);
}
```

**`BottomNav.tsx`** — padding above home indicator:
```css
padding-bottom: max(env(safe-area-inset-bottom), 0.5rem);
```

**Páginas a ajustar:**

| Página | Ajuste |
|---|---|
| `patient-home` | Cards empilhados em coluna única; BottomNav fixo com safe area |
| `login` | Landing em coluna única mobile; form com espaçamento adequado |
| `patients/[id]` | Tabs com scroll horizontal; painéis empilham verticalmente |
| `onboarding` | Safe area top/bottom |

**Padrões Apple HIG:**
- Todos os botões: `min-h-[44px]`
- Inputs: `text-base` (16px) para evitar zoom automático iOS Safari

---

## Arquivos Modificados

| Arquivo | Tipo |
|---|---|
| `scripts/generate-pwa-assets.mjs` | Criar — gera ícones e splash screens |
| `dashboard/public/icon-192.png` | Criar |
| `dashboard/public/icon-512.png` | Criar |
| `dashboard/public/apple-touch-icon.png` | Criar |
| `dashboard/public/splash/*.png` | Criar (4 arquivos) |
| `dashboard/public/manifest.json` | Atualizar |
| `dashboard/src/app/layout.tsx` | Atualizar — viewport, apple tags, splash links |
| `dashboard/src/app/globals.css` | Atualizar — safe area insets |
| `dashboard/src/components/BottomNav.tsx` | Atualizar — safe area padding |
| `dashboard/src/app/patient-home/page.tsx` | Atualizar — layout mobile |
| `dashboard/src/app/login/page.tsx` | Atualizar — layout mobile |
| `dashboard/src/app/patients/[id]/page.tsx` | Atualizar — tabs mobile |

## Teste

1. Abrir `www.clarita.tec.br` no Safari do iPhone
2. Compartilhar → "Adicionar à Tela de Início"
3. Verificar: ícone correto, splash screen ao abrir, layout sem cortes no notch
4. Verificar: BottomNav não cortado pelo home indicator
5. Verificar: inputs não causam zoom ao focar
