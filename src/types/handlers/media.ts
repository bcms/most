import type { BCMSMedia } from '@becomes/cms-client/types';

export interface BCMSMostMediaHandler {
  pull(): Promise<void>;
  getPath(target: BCMSMedia, allMedia: BCMSMedia[]): string | null;
  findAllChildren(target: BCMSMedia, allMedia: BCMSMedia[]): BCMSMedia[];
  remove(target: BCMSMedia | string, allMedia?: BCMSMedia[]): Promise<void>;
  download(target: BCMSMedia | string, allMedia?: BCMSMedia[]): Promise<void>;
}
