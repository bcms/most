import type { BCMSMostOnMessage } from '../on-message';

export interface BCMSMostFunctionHandler {
  call<Payload>(data?: {
    payload?: Payload;
    name?: string;
    onMessage?: BCMSMostOnMessage;
  }): Promise<void>;
}
