import { invoke } from '@tauri-apps/api/tauri';
import { IpcCommand, ReadFileResponse, WriteFileResponse } from '@core/contracts/IpcBridge';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

export class FileOpsIPC {
    /**
     * Requests the text content of a file from the native OS.
     * @param path The absolute path to the target file.
     * @returns A promise resolving to the strict ReadFileResponse contract.
     */
    public static async readFile(path: string): Promise<ReadFileResponse> {
        SystemLogger.log(LogLevel.IPC_TRAFFIC, 'FileOpsIPC', `Invoking ${IpcCommand.ReadFile}`, { path });
        try {
            // Tauri maps JS camelCase 'filePath' to Rust snake_case 'file_path'
            const response = await invoke<ReadFileResponse>(IpcCommand.ReadFile, {
                filePath: path 
            });
            return response;
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'FileOpsIPC', `Failed to read file: ${path}`, error);
            throw error;
        }
    }

    /**
     * Writes text content to a file on the native OS.
     * @param path The absolute path where the file should be saved.
     * @param content The full string content to write.
     * @returns A promise resolving to the strict WriteFileResponse contract.
     */
    public static async writeFile(path: string, content: string): Promise<WriteFileResponse> {
        SystemLogger.log(LogLevel.IPC_TRAFFIC, 'FileOpsIPC', `Invoking ${IpcCommand.WriteFile}`, { path });
        try {
            const response = await invoke<WriteFileResponse>(IpcCommand.WriteFile, {
                filePath: path,
                fileContent: content
            });

            if (!response.success) {
                SystemLogger.log(LogLevel.WARN, 'FileOpsIPC', `Write operation failed natively: ${response.error_message}`, { path });
            }

            return response;
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'FileOpsIPC', `Hard failure during write IPC call: ${path}`, error);
            throw error;
        }
    }
}