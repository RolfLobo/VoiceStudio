import { describe, expect, it, vi } from 'vitest';
import { installAppIdentity } from './app-identity';

describe('installAppIdentity', () => {
  it('names the process before macOS creates its application menu', () => {
    const setName = vi.fn();

    installAppIdentity({ setName });

    expect(setName).toHaveBeenCalledOnce();
    expect(setName).toHaveBeenCalledWith('VoiceStudio');
  });
});
