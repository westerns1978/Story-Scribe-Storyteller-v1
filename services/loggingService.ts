export type LogLevel = 'log' | 'warn' | 'error';

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    data?: any;
}

class LoggingService {
    private logs: LogEntry[] = [];
    private static readonly MAX_LOGS = 200;

    private addLog(level: LogLevel, message: string, data?: any) {
        if (this.logs.length >= LoggingService.MAX_LOGS) {
            this.logs.shift(); // Remove the oldest log
        }
        const entry: LogEntry = {
            timestamp: new Date(),
            level,
            message,
            data,
        };
        this.logs.push(entry);

        // Also log to console for real-time debugging during development
        const consoleArgs = data ? [message, data] : [message];
        switch (level) {
            case 'log':
                console.log(...consoleArgs);
                break;
            case 'warn':
                console.warn(...consoleArgs);
                break;
            case 'error':
                console.error(...consoleArgs);
                break;
        }
    }

    log(message: string, data?: any) {
        this.addLog('log', message, data);
    }

    warn(message: string, data?: any) {
        this.addLog('warn', message, data);
    }

    error(message: string, data?: any) {
        this.addLog('error', message, data);
    }

    getLogs(): LogEntry[] {
        return [...this.logs]; // Return a copy
    }

    clearLogs() {
        this.logs = [];
    }
}

export const loggingService = new LoggingService();
