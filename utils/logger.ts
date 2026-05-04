import { LogEntry, LogLevel } from '../types';

type LogListener = (entry: LogEntry) => void;

class Logger {
  private listeners: LogListener[] = [];

  subscribe(listener: LogListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  log(level: LogLevel, message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      level,
      message,
      details
    };
    
    console.log(`[${level.toUpperCase()}] ${message}`, details || '');
    this.listeners.forEach(listener => listener(entry));
  }

  info(message: string, details?: any) { this.log('info', message, details); }
  success(message: string, details?: any) { this.log('success', message, details); }
  warn(message: string, details?: any) { this.log('warning', message, details); }
  error(message: string, details?: any) { this.log('error', message, details); }
}

export const logger = new Logger();
