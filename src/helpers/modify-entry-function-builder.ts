import {
  BCMSMostCacheContentItem,
  BCMSMostConfigEntryModifyFunction,
} from '../types';

export function BCMSModifyEntryFunctionBuilder<
  T,
  K,
  R extends BCMSMostCacheContentItem
>(
  handler: BCMSMostConfigEntryModifyFunction<T, K, R>,
): BCMSMostConfigEntryModifyFunction<T, K, R> {
  return handler;
}
