import type { AboutPanelOptionsOptions, App, MenuItemConstructorOptions } from 'electron';

export const DESKTOP_APP_NAME = 'VoiceStudio';

/** Set before Electron creates the native application menu. */
export function installAppIdentity(application: Pick<App, 'setName'>): void {
  application.setName(DESKTOP_APP_NAME);
}

export function createMacApplicationMenuTemplate(): MenuItemConstructorOptions[] {
  return [
    {
      label: DESKTOP_APP_NAME,
      submenu: [
        { role: 'about', label: `About ${DESKTOP_APP_NAME}` },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide', label: `Hide ${DESKTOP_APP_NAME}` },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: `Quit ${DESKTOP_APP_NAME}` },
      ],
    },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
  ];
}

interface AboutApplication {
  setAboutPanelOptions(options: AboutPanelOptionsOptions): void;
}

interface ApplicationMenuInstaller<TMenu> {
  buildFromTemplate(template: MenuItemConstructorOptions[]): TMenu;
  setApplicationMenu(menu: TMenu): void;
}

export function installMacApplicationMenu<TMenu>(
  application: AboutApplication,
  menu: ApplicationMenuInstaller<TMenu>,
  version: string,
): void {
  application.setAboutPanelOptions({
    applicationName: DESKTOP_APP_NAME,
    applicationVersion: version,
    version,
  });
  menu.setApplicationMenu(menu.buildFromTemplate(createMacApplicationMenuTemplate()));
}
