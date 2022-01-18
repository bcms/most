import type { BCMSEntryParsed, BCMSMedia } from '@becomes/cms-client/types';

export interface BCMSMostCacheContent {
  [name: string]: BCMSEntryParsed[];
}

export interface BCMSMostFnCache {
  [name: string]: unknown;
}

export interface BCMSMostMediaCache {
  items: BCMSMedia[];
}
