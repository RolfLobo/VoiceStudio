import { describe, expect, it, vi } from 'vitest';
import {
  createMacApplicationMenuTemplate,
  installAppIdentity,
  installMacApplicationMenu,
} from './app-identity';

describe('installAppIdentity', () => {
  it('names Electron internals consistently', () => {
    const setName = vi.fn();

    installAppIdentity({ setName });

    expect(setName).toHaveBeenCalledOnce();
    expect(setName).toHaveBeenCalledWith('VoiceStudio');
  });

  it('defines the complete native macOS menu with VoiceStudio app labels', () => {
    const template = createMacApplicationMenuTemplate();

    expect(template[0]).toMatchObject({ label: 'VoiceStudio' });
    expect(template[0]?.submenu).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'about', label: 'About VoiceStudio' }),
        expect.objectContaining({ role: 'hide', label: 'Hide VoiceStudio' }),
        expect.objectContaining({ role: 'quit', label: 'Quit VoiceStudio' }),
      ]),
    );
    expect(template.slice(1)).toEqual([
      { role: 'fileMenu' },
      { role: 'editMenu' },
      { role: 'viewMenu' },
      { role: 'windowMenu' },
    ]);
  });

  it('brands the About panel and installs the macOS menu', () => {
    const application = {
      setAboutPanelOptions: vi.fn(),
    };
    const nativeMenu = { id: 'native-menu' };
    const menu = {
      buildFromTemplate: vi.fn(() => nativeMenu),
      setApplicationMenu: vi.fn(),
    };

    installMacApplicationMenu(application, menu, '0.5.6');

    expect(application.setAboutPanelOptions).toHaveBeenCalledWith({
      applicationName: 'VoiceStudio',
      applicationVersion: '0.5.6',
      version: '0.5.6',
    });
    expect(menu.setApplicationMenu).toHaveBeenCalledWith(nativeMenu);
  });
});
