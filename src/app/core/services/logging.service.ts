import { Injectable, inject, isDevMode } from '@angular/core';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Centralized logging service
 * Replaces console.log/error/warn with a structured logging approach
 * In production, logs can be sent to a logging service (e.g., Sentry, LogRocket)
 */
@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private readonly minLogLevel: LogLevel = isDevMode() ? LogLevel.DEBUG : LogLevel.WARN;

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, data?: any, context?: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const logMessage = this.formatMessage(message, context);
      console.debug(`[DEBUG] ${logMessage}`, data || '');
    }
  }

  /**
   * Log info messages
   */
  info(message: string, data?: any, context?: string): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const logMessage = this.formatMessage(message, context);
      console.info(`[INFO] ${logMessage}`, data || '');
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, data?: any, context?: string): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const logMessage = this.formatMessage(message, context);
      console.warn(`[WARN] ${logMessage}`, data || '');
    }
    // In production, send to logging service
    this.sendToLoggingService(LogLevel.WARN, message, data, context);
  }

  /**
   * Log error messages
   */
  error(message: string, error?: any, context?: string): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const logMessage = this.formatMessage(message, context);
      console.error(`[ERROR] ${logMessage}`, error || '');
    }
    // In production, send to logging service
    this.sendToLoggingService(LogLevel.ERROR, message, error, context);
  }

  /**
   * Log HTTP errors
   */
  logHttpError(error: any, context?: string): void {
    const errorMessage =
      error?.error?.message ||
      error?.error?.Message ||
      error?.message ||
      'Unknown HTTP error';
    const errorDetails = {
      status: error?.status,
      statusText: error?.statusText,
      url: error?.url,
      error: error?.error,
    };

    this.error(`HTTP Error: ${errorMessage}`, errorDetails, context);
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLogLevel;
  }

  /**
   * Format log message with context
   */
  private formatMessage(message: string, context?: string): string {
    return context ? `[${context}] ${message}` : message;
  }

  /**
   * Send logs to external logging service (e.g., Sentry, LogRocket)
   * This is called for WARN and ERROR levels in production
   */
  private sendToLoggingService(
    level: LogLevel,
    message: string,
    data?: any,
    context?: string,
  ): void {
    if (isDevMode()) {
      return; // Only send to external service in production
    }

    // TODO: Integrate with external logging service
    // Example: Sentry.captureException(new Error(message), { extra: data, tags: { context } });
  }
}

