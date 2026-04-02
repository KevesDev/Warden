import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { IpcCommand, ReadDirectoryResponse } from '@core/contracts/IpcBridge';
import { useEditorStore } from '@core/state/editorStore';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

export class FileSystemIPC {
    /**
     * The unified entry point for opening a workspace.
     * Consolidates logic for TopMenu and Sidebar to ensure a single source of truth.
     */
    public static async openWorkspace(): Promise<void> {
        const store = useEditorStore.getState();
        
        SystemLogger.log(LogLevel.INFO, 'FileSystemIPC', 'Opening directory selection dialog');
        
        try {
            const selectedPath = await open({
                directory: true,
                multiple: false
            });

            if (typeof selectedPath === 'string') {
                store.setStatus('Loading workspace...');
                const response = await invoke<ReadDirectoryResponse>(IpcCommand.ReadDirectory, {
                    directoryPath: selectedPath 
                });
                
                // Hydrate global tree
                store.setRootNode(response.root_node);
                store.setStatus(`Workspace loaded: ${selectedPath}`);
                SystemLogger.log(LogLevel.INFO, 'FileSystemIPC', `Workspace hydrated: ${selectedPath}`);
            }
        } catch (error) {
            SystemLogger.log(LogLevel.ERROR, 'FileSystemIPC', 'Failed to initialize workspace', error);
            store.setStatus('Failed to open workspace.');
        }
    }

    /**
     * Reads a directory shallowly for lazy loading.
     */
    public static async readDirectory(path: string): Promise<ReadDirectoryResponse> {
        SystemLogger.log(LogLevel.IPC_TRAFFIC, 'FileSystemIPC', `Reading directory: ${path}`);
        return await invoke<ReadDirectoryResponse>(IpcCommand.ReadDirectory, {
            directoryPath: path 
        });
    }
}