export type BCMSMostOnMessageLevel = 'info' | 'warn' | 'error';

export interface BCMSMostOnMessage {
  (level: BCMSMostOnMessageLevel, message: string | Error): void;
}
