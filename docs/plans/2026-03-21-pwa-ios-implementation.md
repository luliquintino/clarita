# PWA iOS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tornar o Clarita instalável como PWA no iPhone (Add to Home Screen) com ícone correto, splash screen e layout responsivo nativo.

**Architecture:** Gerar assets PWA via script Node.js com `sharp`, adicionar meta tags iOS ao `layout.tsx`, aplicar `env(safe-area-inset-*)` no CSS global e no BottomNav, e revisar responsividade das páginas principais para mobile.

**Tech Stack:** Next.js 14, Tailwind CSS, sharp (Node.js image processing), iOS PWA meta tags

---

### Task 1: Instalar sharp e criar script gerador de assets

**Files:**
- Create: `dashboard/scripts/generate-pwa-assets.mjs`

**Step 1: Instalar sharp no dashboard**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm install --save-dev sharp
```

Expected: `sharp` added to `devDependencies` in `package.json`.

**Step 2: Criar o script**

Create `dashboard/scripts/generate-pwa-assets.mjs`:

```js
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath = join(publicDir, 'logo-clarita.svg');
const svgBuffer = readFileSync(svgPath);

// Background color matching Clarita brand
const BG = { r: 240, g: 253, b: 244, alpha: 1 }; // #f0fdf4

async function makeIcon(size, filename) {
  const padding = Math.round(size * 0.15);
  const logoSize = size - padding * 2;

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{
      input: await sharp(svgBuffer).resize(logoSize, logoSize).png().toBuffer(),
      gravity: 'center',
    }])
    .png()
    .toFile(join(publicDir, filename));

  console.log(`✓ ${filename}`);
}

async function makeSplash(width, height, filename) {
  mkdirSync(join(publicDir, 'splash'), { recursive: true });
  const logoSize = Math.round(Math.min(width, height) * 0.25);

  await sharp({
    create: { width, height, channels: 4, background: BG },
  })
    .composite([{
      input: await sharp(svgBuffer).resize(logoSize, logoSize).png().toBuffer(),
      gravity: 'center',
    }])
    .png()
    .toFile(join(publicDir, 'splash', filename));

  console.log(`✓ splash/${filename}`);
}

async function main() {
  console.log('Generating PWA assets...\n');

  // Icons
  await makeIcon(192, 'icon-192.png');
  await makeIcon(512, 'icon-512.png');
  await makeIcon(180, 'apple-touch-icon.png');

  // Splash screens (portrait orientation — width x height)
  await makeSplash(1290, 2796, 'splash-2796x1290.png'); // iPhone 14/15 Pro Max
  await makeSplash(1179, 2556, 'splash-2556x1179.png'); // iPhone 15 Pro
  await makeSplash(1170, 2532, 'splash-2532x1170.png'); // iPhone 14/15
  await makeSplash(750, 1334, 'splash-1334x750.png');   // iPhone SE

  console.log('\n✅ All PWA assets generated successfully.');
}

main().catch(err => { console.error(err); process.exit(1); });
```

**Step 3: Add script to package.json**

In `dashboard/package.json`, add to `scripts`:
```json
"pwa:assets": "node scripts/generate-pwa-assets.mjs"
```

**Step 4: Run the script**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard
npm run pwa:assets
```

Expected output:
```
Generating PWA assets...

✓ icon-192.png
✓ icon-512.png
✓ apple-touch-icon.png
✓ splash/splash-2796x1290.png
✓ splash/splash-2556x1179.png
✓ splash/splash-2532x1170.png
✓ splash/splash-1334x750.png

✅ All PWA assets generated successfully.
```

Verify files exist:
```bash
ls dashboard/public/*.png dashboard/public/splash/
```

**Step 5: Commit**

```bash
git add dashboard/scripts/generate-pwa-assets.mjs dashboard/package.json dashboard/public/icon-192.png dashboard/public/icon-512.png dashboard/public/apple-touch-icon.png dashboard/public/splash/
git commit -m "feat: add PWA asset generator and generate iOS icons + splash screens"
```

---

### Task 2: Atualizar manifest.json e layout.tsx

**Files:**
- Modify: `dashboard/public/manifest.json`
- Modify: `dashboard/src/app/layout.tsx`

**Step 1: Atualizar manifest.json**

Replace the entire `dashboard/public/manifest.json` with:

```json
{
  "name": "CLARITA — Saúde Mental",
  "short_name": "Clarita",
  "description": "Monitore sua saúde mental com acompanhamento profissional",
  "start_url": "/patient-home",
  "display": "standalone",
  "background_color": "#f0fdf4",
  "theme_color": "#22c55e",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Step 2: Atualizar layout.tsx**

Replace the entire `dashboard/src/app/layout.tsx` with:

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'CLARITA',
  description:
    'Plataforma CLARITA de saúde mental para monitoramento de pacientes, análise emocional e gestão clínica.',
  keywords: ['saúde mental', 'painel', 'clínico', 'monitoramento de pacientes'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22c55e" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Clarita" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* iOS Splash Screens */}
        <link rel="apple-touch-startup-image" href="/splash/splash-2796x1290.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-2556x1179.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-2532x1170.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" />
        <link rel="apple-touch-startup-image" href="/splash/splash-1334x750.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
```

**Step 3: Verify TypeScript**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npx tsc --noEmit 2>&1
```
Expected: no errors.

**Step 4: Commit**

```bash
git add dashboard/public/manifest.json dashboard/src/app/layout.tsx
git commit -m "feat: add iOS splash screens, apple-touch-icon and viewport-fit=cover to layout"
```

---

### Task 3: Safe area insets no globals.css e BottomNav

**Files:**
- Modify: `dashboard/src/app/globals.css`
- Modify: `dashboard/src/components/BottomNav.tsx`

**Step 1: Adicionar safe area ao globals.css**

In `dashboard/src/app/globals.css`, inside the `body` rule (after `-moz-osx-font-smoothing: grayscale;`), add:

```css
    /* iOS safe area — respeitar notch e home indicator */
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
```

**Step 2: Atualizar BottomNav.tsx**

In `dashboard/src/components/BottomNav.tsx`, the `<nav>` currently has:
```tsx
<nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-white/40 shadow-lg">
```

Add `pb-safe` support by changing the inner `<div>` style to include safe area padding:

Replace:
```tsx
      <div
        className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
```

With:
```tsx
      <div
        className="flex items-center gap-1 px-2 py-2 overflow-x-auto scrollbar-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        }}
      >
```

**Step 3: Verify build**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npm run build 2>&1 | tail -20
```
Expected: `✓ Compiled successfully`

**Step 4: Commit**

```bash
git add dashboard/src/app/globals.css dashboard/src/components/BottomNav.tsx
git commit -m "feat: add iOS safe area insets to body and BottomNav"
```

---

### Task 4: Responsividade mobile — patient-home e login

**Files:**
- Modify: `dashboard/src/app/patient-home/page.tsx`
- Modify: `dashboard/src/app/login/page.tsx`

**Step 1: Verificar patient-home em mobile**

Read `dashboard/src/app/patient-home/page.tsx` and find the main grid:
```bash
grep -n "grid\|col-span\|flex\|gap" dashboard/src/app/patient-home/page.tsx | head -20
```

Ensure the professionals sidebar stacks below check-in on mobile — look for `md:col-span-3` / `md:col-span-2` grid pattern. If grid is `grid-cols-1 md:grid-cols-5`, it already stacks. Just verify.

Buttons that trigger actions must be `min-h-[44px]` — find small buttons:
```bash
grep -n "py-1\|py-0\|text-xs.*button\|btn.*xs" dashboard/src/app/patient-home/page.tsx | head -10
```

Fix any `py-1` action buttons to `py-2 min-h-[44px]`.

**Step 2: Verificar login em mobile**

Read `dashboard/src/app/login/page.tsx` and ensure landing side is hidden on mobile (`hidden lg:flex`) and login form takes full width on mobile (`w-full`).

Find the split layout:
```bash
grep -n "lg:\|hidden\|w-full\|min-w" dashboard/src/app/login/page.tsx | head -20
```

If the landing panel is `hidden lg:flex` and form is `w-full lg:w-auto`, it already works on mobile. Verify this is the case. If not, add the appropriate classes.

**Step 3: Fix input font-size to prevent iOS zoom**

iOS Safari auto-zooms when inputs have `font-size < 16px`. Find inputs with small text:
```bash
grep -rn "text-sm.*input\|input.*text-sm\|text-xs.*input" dashboard/src/app/login/page.tsx dashboard/src/app/register/page.tsx dashboard/src/app/forgot-password/page.tsx 2>/dev/null | head -20
```

For each `<input>` in auth pages, ensure it has at least `text-base` (16px). Add `text-base` class to inputs that only have `text-sm`.

**Step 4: Build and verify**

```bash
cd /Users/luizaquintino/Desktop/Clarita/dashboard && npm run build 2>&1 | tail -10
```
Expected: no errors.

**Step 5: Commit**

```bash
git add dashboard/src/app/patient-home/page.tsx dashboard/src/app/login/page.tsx dashboard/src/app/register/page.tsx dashboard/src/app/forgot-password/page.tsx
git commit -m "fix: improve mobile responsiveness and fix iOS input zoom on auth pages"
```

---

### Task 5: Deploy e verificação no iPhone

**Step 1: Push to GitHub and deploy**

```bash
cd /Users/luizaquintino/Desktop/Clarita && git push origin main
vercel --prod 2>&1 | tail -5
```

Expected: `Aliased: https://www.clarita.tec.br`

**Step 2: Verificar no iPhone (Safari)**

1. Abrir `https://www.clarita.tec.br` no Safari do iPhone
2. Tocar em **Compartilhar** (ícone de caixa com seta)
3. Tocar em **"Adicionar à Tela de Início"**
4. Verificar:
   - ✅ Ícone aparece correto (não é screenshot genérico)
   - ✅ Nome aparece "Clarita"
   - ✅ Ao abrir pelo ícone: splash screen verde aparece
   - ✅ Sem barra de endereço do Safari (display: standalone)
   - ✅ Conteúdo não cortado pelo notch
   - ✅ BottomNav não coberto pelo home indicator
   - ✅ Inputs não causam zoom ao focar
