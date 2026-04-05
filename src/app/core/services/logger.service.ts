import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: number;
  context?: string;
}

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private platformId = inject(PLATFORM_ID);
  private isProduction = environment.production;
  private logs: LogEntry[] = [];
  private maxLogs = 100;

  private shouldLog(level: LogLevel): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return level === 'error';
    }
    
    if (this.isProduction) {
      return level === 'error' || level === 'warn';
    }
    
    return true;
  }

  private log(level: LogLevel, message: string, data?: unknown, context?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      context,
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const prefix = context ? `[${context}]` : '[APP]';
    const formattedMessage = `${prefix} ${message}`;

    switch (level) {
      case 'debug':
        if (!this.isProduction) {
          console.debug(formattedMessage, data ?? '');
        }
        break;
      case 'info':
        if (!this.isProduction) {
          console.info(formattedMessage, data ?? '');
        }
        break;
      case 'warn':
        console.warn(formattedMessage, data ?? '');
        break;
      case 'error':
        console.error(formattedMessage, data ?? '');
        break;
    }
  }

  debug(message: string, data?: unknown, context?: string): void {
    this.log('debug', message, data, context);
  }

  info(message: string, data?: unknown, context?: string): void {
    this.log('info', message, data, context);
  }

  warn(message: string, data?: unknown, context?: string): void {
    this.log('warn', message, data, context);
  }

  error(message: string, data?: unknown, context?: string): void {
    this.log('error', message, data, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}
