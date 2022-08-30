import type {
  BCMSClientChangesGetInfoData,
  BCMSEntryParsed,
  BCMSMedia,
  BCMSTemplate,
} from '@becomes/cms-client/types';
import type { BCMSMediaExtended } from '..';
import type {
  BCMSMostFnCache,
  BCMSMostMediaCache,
  BCMSMostCacheContent,
} from '../cache';

interface Query<Item> {
  (item: Item): unknown;
}

/**
 * Caches are used to provide faster access and easier
 * manipulation over BCMS API output. In addition to this,
 * caches are lowering a load on the BCMS API by providing
 * a local copy of the data stored in the BCMS. Caches are
 * stored in the filesystem under `~/bcms/*` as a JSON
 * files. Event though they can be modified manually, it is
 * not recommended because changes can be over written by
 * the handler. Caches are split into 4 parts:
 *
 * - `content.cache.json` - file storing cached data of the
 * BCMS content API,
 * - `media.cache.json` - file storing cached data of the
 * BCMS media API (only media indexes and metadata are stored),
 * - `function.cache.json` - file storing cached responses from
 * the functions called in build time (defined in bcms.config.js file).
 *
 * `BCMSMostCacheHandler` provides easy access to this files
 * and manipulation of them.
 */
export interface BCMSMostCacheHandler {
  template: {
    get(force?: boolean): Promise<BCMSTemplate[]>;
    find(query: Query<BCMSTemplate>): Promise<BCMSTemplate[]>;
    findOne(query: Query<BCMSTemplate>): Promise<BCMSTemplate | null>;
    set(items: BCMSTemplate | BCMSTemplate[]): Promise<void>;
    remove(items: BCMSTemplate | BCMSTemplate[]): Promise<void>;
  };
  content: {
    changes: {
      get(): Promise<BCMSClientChangesGetInfoData | null>;
      set(data: BCMSClientChangesGetInfoData): Promise<void>;
    };
    getGroups(reverse?: boolean): Promise<{ [groupName: string]: string }>;
    get(force?: boolean): Promise<BCMSMostCacheContent>;
    findOneInGroup(
      groupName: string,
      query: Query<BCMSEntryParsed>,
    ): Promise<BCMSEntryParsed | null>;
    findOne(query: Query<BCMSEntryParsed>): Promise<BCMSEntryParsed | null>;
    findInGroup(
      groupName: string,
      query: Query<BCMSEntryParsed>,
    ): Promise<BCMSEntryParsed[]>;
    find(query: Query<BCMSEntryParsed>): Promise<BCMSEntryParsed[]>;
    set(data: {
      groupName: string;
      items: BCMSEntryParsed | BCMSEntryParsed[];
    }): Promise<void>;
    update(items: BCMSEntryParsed | BCMSEntryParsed[]): Promise<void>;
    remove(
      items:
        | BCMSEntryParsed
        | BCMSEntryParsed[]
        | { _id: string }
        | Array<{ _id: string }>,
    ): Promise<void>;
  };
  media: {
    get(force?: boolean): Promise<BCMSMostMediaCache>;
    findOne(query: Query<BCMSMediaExtended>): Promise<BCMSMediaExtended | null>;
    find(query: Query<BCMSMediaExtended>): Promise<BCMSMediaExtended[]>;
    set(
      items: BCMSMediaExtended | BCMSMediaExtended[] | BCMSMedia | BCMSMedia[],
    ): Promise<void>;
    remove(
      items:
        | BCMSMedia
        | BCMSMedia[]
        | BCMSMediaExtended
        | BCMSMediaExtended[]
        | { _id: string }
        | Array<{ _id: string }>,
    ): Promise<void>;
  };
  function: {
    get(): Promise<BCMSMostFnCache>;
    findOne<Data>(
      query: Query<{ name: string; data: unknown }>,
    ): Promise<Data | null>;
    set(name: string, data: unknown): Promise<void>;
  };
}
