import { BCMSEntriesModifyFunction } from '../types';

export function BCMSModifyEntryFunctionBuilder<T, K, R>(
  handler: BCMSEntriesModifyFunction<T, K, R>,
): BCMSEntriesModifyFunction<T, K, R> {
  return handler;
}
