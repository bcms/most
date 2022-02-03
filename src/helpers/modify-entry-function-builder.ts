import {
  BCMSMostCacheContentItem,
  BCMSMostConfigEntryModifyFunction,
} from '../types';

export function BCMSModifyEntryFunctionBuilder<
  Cache,
  Result extends BCMSMostCacheContentItem,
>(
  handler: BCMSMostConfigEntryModifyFunction<Cache, Result>,
): BCMSMostConfigEntryModifyFunction<Cache, Result> {
  return handler;
}
