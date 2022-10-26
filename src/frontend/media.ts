import type { BCMSMediaParsed } from '@becomes/cms-client/types';
import { BCMSImageConfig } from './image-config';

export function bcmsMediaToUrl(media: BCMSMediaParsed): string {
  return `${BCMSImageConfig.cmsOrigin}/api/media/pip/${media._id}/bin/${BCMSImageConfig.publicApiKeyId}/${media.name}`;
}
