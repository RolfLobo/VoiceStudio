import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';
// This is a Node launcher shared with the package script, so it intentionally
// remains plain ESM rather than being compiled into Electron's main process.
// @ts-expect-error JavaScript launcher has no separate declaration file.
import { createMacDevBundlePlan } from '../../scripts/dev.mjs';

describe('macOS development bundle branding', () => {
  it('uses a VoiceStudio bundle while preserving Electron development detection', () => {
    const plan = createMacDevBundlePlan({
      electronExecutable: '/source/Electron.app/Contents/MacOS/Electron',
      electronVersion: '44.3.0',
      appVersion: '0.5.6',
      architecture: 'arm64',
      cacheRoot: '/cache',
    });

    expect(plan.sourceBundle).toBe('/source/Electron.app');
    expect(plan.destinationBundle).toBe('/cache/44.3.0-0.5.6-arm64/VoiceStudio.app');
    expect(basename(plan.destinationExecutable)).toBe('Electron');
    expect(plan.destinationExecutable).toContain('/VoiceStudio.app/Contents/MacOS/Electron');
  });
});
