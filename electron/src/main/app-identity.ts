import type { App } from 'electron';

export const DESKTOP_APP_NAME = 'VoiceStudio';

/** Set before Electron creates the native application menu. */
export function installAppIdentity(application: Pick<App, 'setName'>): void {
  application.setName(DESKTOP_APP_NAME);
}
