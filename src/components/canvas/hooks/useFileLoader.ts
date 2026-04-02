import { useEffect, useState } from 'react';
import { useEditorStore } from '@core/state/editorStore';
import { FileOpsIPC } from '@services/rust-bridge/fileOpsIpc';
import { SystemLogger, LogLevel } from '@core/utils/systemLogger';

/**
 * Custom hook to manage the lifecycle of lazy-loading native files into memory buffers.
 * Abstracted to enforce Extreme Decoupling from the UI presentation layer.
 */
export const useFileLoader = () => {
    const { activeFilePath, fileBuffers, hydrateBuffer } = useEditorStore();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!activeFilePath) return;
        
        // Prevents redundant disk I/O if the file is already buffered in memory
        if (fileBuffers.has(activeFilePath)) return;

        const loadContentFromDisk = async () => {
            setIsLoading(true);
            try {
                SystemLogger.log(LogLevel.INFO, 'UseFileLoader', `Fetching native disk contents: ${activeFilePath}`);
                const res = await FileOpsIPC.readFile(activeFilePath);
                
                // Hydrate the global store buffer (which clears the dirty flag automatically)
                hydrateBuffer(activeFilePath, res.file_content);
            } catch (err) {
                SystemLogger.log(LogLevel.ERROR, 'UseFileLoader', `Critical disk read failure: ${activeFilePath}`, err);
            } finally {
                setIsLoading(false);
            }
        };

        loadContentFromDisk();
    }, [activeFilePath, fileBuffers, hydrateBuffer]);

    return { isLoading };
};