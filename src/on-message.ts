import type { BCMSMostOnMessage } from './types';

export function createBcmsMostDefaultOnMessage(): BCMSMostOnMessage {
  return (level, message) => {
    if (level === 'error') {
      throw message;
    } else if (level === 'warn') {
      // eslint-disable-next-line no-console
      console.warn(message);
    } else {
      // eslint-disable-next-line no-console
      console.log(message);
    }
  };
}
