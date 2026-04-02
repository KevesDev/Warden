import { appWindow } from '@tauri-apps/api/window';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Provides production-level access to native OS window controls.
 * Encapsulates Tauri windowing APIs to maintain UI decoupling.
 */
export class WindowIPC {
    /**
     * Minimizes the application window to the taskbar.
     */
    public static async minimize(): Promise<void> {
        try {
            await appWindow.minimize();
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'WindowIPC', 'Native minimize call failed', error);
        }
    }

    /**
     * Toggles between windowed and maximized states.
     */
    public static async toggleMaximize(): Promise<void> {
        try {
            await appWindow.toggleMaximize();
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'WindowIPC', 'Native maximize toggle failed', error);
        }
    }

    /**
     * Safely closes the application window.
     */
    public static async close(): Promise<void> {
        try {
            await appWindow.close();
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'WindowIPC', 'Native close call failed', error);
        }
    }
}