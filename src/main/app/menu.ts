import { Menu, app, type MenuItemConstructorOptions } from 'electron';

/**
 * macOS needs an application menu (it holds Quit and the copy/paste shortcuts). On Windows the default
 * menu is removed in installed builds so nobody stumbles into the developer tools.
 */
export function installMenu(): void {
  if (process.platform !== 'darwin') {
    if (app.isPackaged) Menu.setApplicationMenu(null);
    return;
  }
  const template: MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    { role: 'editMenu' },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
