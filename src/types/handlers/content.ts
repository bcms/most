import type { BCMSMostOnMessage } from '../on-message';

export interface BCMSMostContentHandler {
  pull(data?: { onMessage?: BCMSMostOnMessage }): Promise<void>;
}
