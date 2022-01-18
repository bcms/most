import type { BCMSMedia } from '@becomes/cms-client/types';

export interface BCMSMostMediaHandler {
  pull(): Promise<void>;
  getPath(target: BCMSMedia, allMedia: BCMSMedia[]): string | null;
}
