import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Resolve path safely whether process.cwd() is monorepo root or package root
function getFilePath(relPath: string) {
  if (process.cwd().endsWith('apps/web-cockpit')) {
    return resolve(process.cwd(), relPath.replace(/^apps\/web-cockpit\//, ''));
  }
  return resolve(process.cwd(), relPath);
}

describe('Web Cockpit Canvas Effects & Cyber Styling Test Suite', () => {
  it('CursorEnergy ensures SSR guards, pointer check, and physics animation cleanup', () => {
    const file = getFilePath('apps/web-cockpit/src/components/common/CursorEnergy.tsx');
    const content = readFileSync(file, 'utf-8');

    assert.ok(content.includes('typeof window === \'undefined\''), 'Includes SSR guard');
    assert.ok(content.includes('(pointer: coarse)'), 'Checks coarse pointer for touch devices');
    assert.ok(content.includes('(prefers-reduced-motion: reduce)'), 'Checks prefers-reduced-motion for accessibility');
    assert.ok(content.includes('window.addEventListener(\'mousemove\', onMouseMove'), 'Attaches mousemove listener');
    assert.ok(content.includes('window.removeEventListener(\'mousemove\', onMouseMove)'), 'Cleans up mousemove listener');
    assert.ok(content.includes('cancelAnimationFrame(rafId)'), 'Cleans up animation frame on unmount');
    assert.ok(content.includes('radial-gradient'), 'Contains ambient glow radial gradient styles');
  });

  it('CustomCursor cleans up all event listeners and RAF on unmount', () => {
    const file = getFilePath('apps/web-cockpit/src/components/common/CustomCursor.tsx');
    const content = readFileSync(file, 'utf-8');

    assert.ok(content.includes('typeof window === \'undefined\''), 'Includes SSR guard');
    assert.ok(content.includes('(prefers-reduced-motion: reduce)'), 'Checks prefers-reduced-motion for accessibility');
    assert.ok(content.includes('window.removeEventListener(\'mousemove\', onMouseMove)'), 'Cleans up mousemove listener');
    assert.ok(content.includes('window.removeEventListener(\'mousedown\', onMouseDown)'), 'Cleans up mousedown listener');
    assert.ok(content.includes('window.removeEventListener(\'mouseup\', onMouseUp)'), 'Cleans up mouseup listener');
    assert.ok(content.includes('cancelAnimationFrame(rafId)'), 'Cancels RAF on unmount');
    assert.ok(content.includes('z-[9999]'), 'Renders at topmost cursor z-index');
    assert.ok(content.includes('#22d3ee'), 'Contains cyan neon glow');
  });

  it('LayoutShell conditionally unmounts ambient cursor layers on /share routes', () => {
    const file = getFilePath('apps/web-cockpit/src/components/common/LayoutShell.tsx');
    const content = readFileSync(file, 'utf-8');

    assert.ok(content.includes('usePathname'), 'Uses next/navigation pathname');
    assert.ok(content.includes('pathname?.startsWith(\'/share\')'), 'Detects /share route');
    assert.ok(content.includes('!isShare'), 'Conditionally hides cursor effects on share routes');
    assert.ok(content.includes('<CustomCursor />'), 'Mounts CustomCursor');
    assert.ok(content.includes('<CursorEnergy />'), 'Mounts CursorEnergy');
  });

  it('TerrainBackground properly registers and cleans up canvas resize, visibility, and RAF', () => {
    const file = getFilePath('apps/web-cockpit/src/components/common/TerrainBackground.tsx');
    const content = readFileSync(file, 'utf-8');

    assert.ok(content.includes('typeof window === \'undefined\''), 'Includes SSR guard');
    assert.ok(content.includes('(prefers-reduced-motion: reduce)'), 'Checks prefers-reduced-motion for accessibility');
    assert.ok(content.includes('window.addEventListener(\'resize\', resize)'), 'Registers resize listener');
    assert.ok(content.includes('window.removeEventListener(\'resize\', resize)'), 'Cleans up resize listener');
    assert.ok(content.includes('document.addEventListener(\'visibilitychange\', onVisibilityChange)'), 'Registers visibilitychange listener');
    assert.ok(content.includes('document.removeEventListener(\'visibilitychange\', onVisibilityChange)'), 'Cleans up visibilitychange listener');
    assert.ok(content.includes('cancelAnimationFrame(animationFrameId)'), 'Cancels RAF on unmount');
    assert.ok(content.includes('ctx.createLinearGradient'), 'Generates deep space atmospheric horizon gradient');
  });

  it('WarpBackground properly handles 3D projection, hyperspace streaks, and unmount cleanup', () => {
    const file = getFilePath('apps/web-cockpit/src/components/common/WarpBackground.tsx');
    const content = readFileSync(file, 'utf-8');

    assert.ok(content.includes('typeof window === \'undefined\''), 'Includes SSR guard');
    assert.ok(content.includes('(prefers-reduced-motion: reduce)'), 'Checks prefers-reduced-motion for accessibility');
    assert.ok(content.includes('window.addEventListener(\'resize\', resize)'), 'Registers resize listener');
    assert.ok(content.includes('window.removeEventListener(\'resize\', resize)'), 'Cleans up resize listener');
    assert.ok(content.includes('document.addEventListener(\'visibilitychange\', onVisibilityChange)'), 'Registers visibility listener');
    assert.ok(content.includes('document.removeEventListener(\'visibilitychange\', onVisibilityChange)'), 'Cleans up visibility listener');
    assert.ok(content.includes('cancelAnimationFrame(animationFrameId)'), 'Cancels RAF on unmount');
    assert.ok(content.includes('isWarping'), 'Supports hyperspace warp state transition');
    assert.ok(content.includes('ctx.lineTo(px, py)'), 'Draws streak lines during hyperspace warp');
    assert.ok(content.includes('ctx.arc(px, py, size, 0, Math.PI * 2)'), 'Draws cruising star points');
  });

  it('globals.css conforms to dark mode cyber palette, neon accents, and keyframe animations', () => {
    const file = getFilePath('apps/web-cockpit/src/app/globals.css');
    const content = readFileSync(file, 'utf-8');

    assert.ok(content.includes('--background: #060b14;'), 'Dark background conforms to deep cyber slate');
    assert.ok(content.includes('--card: #0c1424;'), 'Dark card conforms to elevated navy');
    assert.ok(content.includes('--accent: #06b6d4;'), 'Dark accent conforms to neon cyan');
    assert.ok(content.includes('@keyframes fadeInUp'), 'Contains fadeInUp keyframes');
    assert.ok(content.includes('@keyframes pulseDot'), 'Contains pulseDot keyframes');
    assert.ok(content.includes('@keyframes gradientShift'), 'Contains gradientShift keyframes');
    assert.ok(content.includes('@keyframes marqueeLeft'), 'Contains marqueeLeft keyframes');
    assert.ok(content.includes('@keyframes marqueeRight'), 'Contains marqueeRight keyframes');
    assert.ok(content.includes('.card-hover'), 'Contains interactive card hover styling');
    assert.ok(content.includes('.shimmer-effect'), 'Contains cyber shimmer effect styling');
    assert.ok(content.includes('prefers-reduced-motion: reduce'), 'Contains reduced-motion override');
  });
});
