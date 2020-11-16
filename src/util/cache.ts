/* eslint-disable @typescript-eslint/no-empty-interface */
export interface CachePrototype {}

function cache(): CachePrototype {
  return {};
}

export const Cache = cache();
