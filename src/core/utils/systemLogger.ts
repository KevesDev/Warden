/**
 * LogLevel strictly defines the severity of system events.
 */
export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    IPC_TRAFFIC = 'IPC_TRAFFIC'
}

/**
 * A centralized, scalable logging utility. 
 * In production, this can be easily extended to write to local disk via Tauri
 * without needing to refactor individual component files.
 */
export class SystemLogger {
    /**
     * Formats and outputs the log to the console with timestamp and strict typing.
     * * @param level The severity of the log.
     * @param context The module or component originating the log (e.g., 'WardenEngine', 'FileTree').
     * @param message The detailed log message.
     * @param payload Optional data payload for deep inspection.
     */
    public static log(level: LogLevel, context: string, message: string, payload?: unknown): void {
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] [${context}] ${message}`;

        switch (level) {
            case LogLevel.INFO:
                console.info(`%c${formattedMessage}`, 'color: #5C3E94', payload || '');
                break;
            case LogLevel.WARN:
                console.warn(`%c${formattedMessage}`, 'color: #F25912', payload || '');
                break;
            case LogLevel.ERROR:
                console.error(formattedMessage, payload || '');
                break;
            case LogLevel.IPC_TRAFFIC:
                console.log(`%c${formattedMessage}`, 'color: #412B6B; font-weight: bold;', payload || '');
                break;
            default:
                console.log(formattedMessage, payload || '');
        }
    }
}