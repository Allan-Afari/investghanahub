/**
 * Comprehensive Structured Logging Service
 * Provides consistent logging across the application
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
  }

  /**
   * Format log entry for console output
   */
  private formatConsole(entry: LogEntry): string {
    const emoji: Record<LogLevel, string> = {
      [LogLevel.DEBUG]: '🔍',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '❌',
      [LogLevel.CRITICAL]: '🔴',
    };

    const prefix = `${emoji[entry.level]} [${entry.timestamp}] [${entry.level}] [${entry.category}]`;
    const message = `${prefix} ${entry.message}`;

    if (entry.data && this.isDev) {
      return `${message}\n${JSON.stringify(entry.data, null, 2)}`;
    }

    if (entry.error) {
      return `${message}\n${entry.error.message}${this.isDev && entry.error.stack ? '\n' + entry.error.stack : ''}`;
    }

    return message;
  }

  /**
   * Format log entry for JSON output (for log aggregation)
   */
  private formatJSON(entry: LogEntry): string {
    return JSON.stringify(entry);
  }

  /**
   * Write log entry
   */
  private write(entry: LogEntry): void {
    const formatted = this.isDev ? this.formatConsole(entry) : this.formatJSON(entry);

    switch (entry.level) {
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.DEBUG:
        if (this.isDev) {
          console.log(formatted);
        }
        break;
      default:
        console.log(formatted);
    }
  }

  /**
   * Create log entry
   */
  private createEntry(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      error: error ? {
        message: error.message,
        stack: this.isDev ? error.stack : undefined,
        code: (error as any).code,
      } : undefined,
    };
  }

  /**
   * Log methods
   */
  debug(category: string, message: string, data?: any): void {
    const entry = this.createEntry(LogLevel.DEBUG, category, message, data);
    this.write(entry);
  }

  info(category: string, message: string, data?: any): void {
    const entry = this.createEntry(LogLevel.INFO, category, message, data);
    this.write(entry);
  }

  warn(category: string, message: string, data?: any, error?: Error): void {
    const entry = this.createEntry(LogLevel.WARN, category, message, data, error);
    this.write(entry);
  }

  error(category: string, message: string, error?: Error, data?: any): void {
    const entry = this.createEntry(LogLevel.ERROR, category, message, data, error);
    this.write(entry);
  }

  critical(category: string, message: string, error?: Error, data?: any): void {
    const entry = this.createEntry(LogLevel.CRITICAL, category, message, data, error);
    this.write(entry);
  }

  /**
   * Grouped logging
   */
  group(category: string, label: string, fn: () => void): void {
    this.info(category, `Started: ${label}`);
    try {
      fn();
      this.info(category, `Completed: ${label}`);
    } catch (error) {
      this.error(category, `Failed: ${label}`, error as Error);
      throw error;
    }
  }

  /**
   * Performance tracking
   */
  async trackPerformance<T>(
    category: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(category, `${operation} completed`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(category, `${operation} failed`, error as Error, { duration: `${duration}ms` });
      throw error;
    }
  }

  /**
   * HTTP request logging
   */
  logRequest(method: string, path: string, statusCode: number, duration: number, userId?: string): void {
    const statusEmoji = statusCode < 300 ? '✅' : statusCode < 400 ? 'ℹ️' : statusCode < 500 ? '⚠️' : '❌';
    this.info('HTTP', `${statusEmoji} ${method} ${path} - ${statusCode} (${duration}ms)`, { userId });
  }

  /**
   * Database operation logging
   */
  logDatabaseOperation(operation: string, table: string, duration: number, rowsAffected?: number): void {
    this.debug('DATABASE', `${operation} on ${table}`, { duration: `${duration}ms`, rowsAffected });
  }

  /**
   * Authentication event logging
   */
  logAuthEvent(event: string, userId: string, success: boolean, reason?: string): void {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    const entry = this.createEntry(level, 'AUTH', `${event}: ${userId} - ${success ? 'SUCCESS' : 'FAILED'}`, { reason });
    this.write(entry);
  }

  /**
   * Business event logging
   */
  logBusinessEvent(eventType: string, businessId: string, userId: string, details?: any): void {
    this.info('BUSINESS', `${eventType} - Business: ${businessId}, User: ${userId}`, details);
  }
}

// Export singleton
export const logger = new Logger();

export default logger;
