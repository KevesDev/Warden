import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { IpcCommand, ReadDirectoryResponse } from '@core/contracts/IpcBridge';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

export class FileSystemIPC {
    /**
     * Triggers the native OS folder selection dialog.
     * @returns The selected absolute directory path, or null if canceled.
     */
    public static async promptDirectorySelection(): Promise<string | null> {
        SystemLogger.log(LogLevel.IPC_TRAFFIC, 'FileSystemIPC', 'Opening native directory selection dialog');
        const selectedPath = await open({
            directory: true,
            multiple: false
        });

        return (typeof selectedPath === 'string') ? selectedPath : null;
    }

    /**
     * Invokes the Rust backend to read a directory shallowly.
     */
    public static async readDirectory(path: string): Promise<ReadDirectoryResponse> {
        SystemLogger.log(LogLevel.IPC_TRAFFIC, 'FileSystemIPC', `Invoking ${IpcCommand.ReadDirectory}`, { path });
        try {
            const response = await invoke<ReadDirectoryResponse>(IpcCommand.ReadDirectory, {
                directoryPath: path 
            });
            return response;
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'FileSystemIPC', `Failed to read directory: ${path}`, error);
            throw error;
        }
    }
}