import type { FS } from '@banez/fs/types';
import type { BCMSMedia } from '@becomes/cms-client/types';
import type {
  BCMSMostImageProcessorHandler,
  BCMSMostImageProcessorProcessOptions,
} from '.';
import type { BCMSMediaExtended } from '..';

export interface BCMSMostMediaHandler {
  output: string[];
  pull(): Promise<void>;
  startImageProcessor(data: {
    media: BCMSMediaExtended | BCMSMedia;
    options: BCMSMostImageProcessorProcessOptions;
    imageProcessor: BCMSMostImageProcessorHandler;
  }): Promise<void>;
  getPath(target: BCMSMedia, allMedia: BCMSMedia[]): string | null;
  findAllChildren(target: BCMSMedia, allMedia: BCMSMedia[]): BCMSMedia[];
  remove(target: string, allMedia?: BCMSMedia[]): Promise<void>;
  download(target: string, allMedia?: BCMSMedia[]): Promise<void>;
  outputFs: FS;
  ppc: number;
}
