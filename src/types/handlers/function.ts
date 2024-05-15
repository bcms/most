import type { BCMSMostOnMessage } from '@becomes/cms-most/types/on-message';

export interface BCMSMostFunctionHandler {
  call<Payload>(data?: {
    payload?: Payload;
    name?: string;
    onMessage?: BCMSMostOnMessage;
  }): Promise<void>;
}
