import type { BCMSEntryParsed } from '@becomes/cms-client/types';
import type { BCMSMostCacheContent } from '../cache';
import type { BCMSMostOnMessage } from '../on-message';

export type BCMSMostContentEntryQueryFunction<QueryResult> = (
  item: BCMSEntryParsed,
  cache: BCMSMostCacheContent,
) => Promise<QueryResult>;

export interface BCMSMostContentHandler {
  pull(data?: { onMessage?: BCMSMostOnMessage }): Promise<void>;
  entry: {
    findOne<QueryResult>(
      template: string,
      query: BCMSMostContentEntryQueryFunction<QueryResult>,
    ): Promise<QueryResult | null>;
    find<QueryResult>(
      template: string,
      query: BCMSMostContentEntryQueryFunction<QueryResult>,
    ): Promise<QueryResult[]>;
  };
}
