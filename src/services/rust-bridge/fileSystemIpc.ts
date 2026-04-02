import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { IpcCommand, ReadDirectoryResponse } from '@core/contracts/IpcBridge';
import { useEditorStore } from '@core/state/editorStore';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Service for native file system interactions.
 * Bridges the React frontend with the Rust backend via Tauri IPC.
 */
export class FileSystemIPC {
    /**
     * Triggers the native folder selection dialog and hydrates the Warden workspace.
     * Reuses logic across Sidebar and Top Menu to eliminate technical debt.
     */
    public static async openWorkspace(): Promise<void> {
        // Accessing the store's static state to dispatch actions safely outside of React render cycle
        const store = useEditorStore.getState();
        
        try {
            SystemLogger.log(LogLevel.INFO, 'FileSystemIPC', 'Opening directory selection dialog');
            const selectedPath = await open({
                directory: true,
                multiple: false
            });

            if (typeof selectedPath === 'string') {
                store.setStatus('Loading workspace...');
                
                const response = await invoke<ReadDirectoryResponse>(IpcCommand.ReadDirectory, {
                    directoryPath: selectedPath 
                });
                
                // Hydrate the global tree and reset UI buffers
                store.setWorkspace(response.root_node);
                store.setStatus(`Workspace hydrated: ${selectedPath}`);
                SystemLogger.log(LogLevel.INFO, 'FileSystemIPC', `Workspace hydrated: ${selectedPath}`);
            }
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'FileSystemIPC', 'Failed to initialize workspace', error);
            store.setStatus('Failed to open workspace.');
        }
    }

    /**
     * Shallow reads a directory for lazy-loading sub-nodes in the File Explorer.
     */
    public static async readDirectory(path: string): Promise<ReadDirectoryResponse> {
        SystemLogger.log(LogLevel.IPC_TRAFFIC, 'FileSystemIPC', `Reading directory: ${path}`);
        return await invoke<ReadDirectoryResponse>(IpcCommand.ReadDirectory, {
            directoryPath: path 
        });
    }
}