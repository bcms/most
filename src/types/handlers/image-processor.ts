import type { BCMSMedia } from '@becomes/cms-client/types';
import type { BCMSMediaExtended } from '@becomes/cms-most/types/cache';

/**
 * Options for image processor. Can be represented as a string:
 *
 * _pfill_q40_se640x360-1280x720-1920x1080_v0
 */
export interface BCMSMostImageProcessorProcessOptions {
  /**
   * How will image be centered if it is cropped.
   */
  position?: 'fill' | 'cover';
  /**
   * From 0 to 100.
   */
  quality?: number;
  /**
   * Specify size versions.
   */
  sizes?: {
    auto?: boolean;
    /**
     * Create versions with exec sizes.
     */
    exec?: Array<{
      width: number;
      height?: number;
    }>;
    /**
     * Define how many versions of the image to create.
     *
     * Example: If image is 1920x1080 and this option is set
     * to 3, 2 versions of the image will be created:
     * - 640x360
     * - 1280x720
     */
    steps?: number;
  };
}

export interface BCMSMostImageProcessorProcessConfig {
  input: string | BCMSMediaExtended;
  inputBasePath: string;
  outputBasePath: string;
  options?: BCMSMostImageProcessorProcessOptions;
  optionsAsString?: string;
}

export interface BCMSMostImageProcessorHandler {
  process(config: BCMSMostImageProcessorProcessConfig): Promise<void>;
  optionsToString(options: BCMSMostImageProcessorProcessOptions): string;
  stringToOptions(options: string): BCMSMostImageProcessorProcessOptions;
  getVersionPaths(data: {
    media: BCMSMediaExtended | BCMSMedia;
    allMedia?: Array<BCMSMediaExtended | BCMSMedia>;
    options: BCMSMostImageProcessorProcessOptions;
  }): string[];
  middlewareHelper(
    path: string,
    outputBase?: string[],
  ): Promise<{
    exist: boolean;
    path?: string;
    mimetype?: string;
    fileName?: string;
    fileSize?: number;
  }>;
  parseSite(data: { urls: string[]; basePath?: string[] }): Promise<void>;
  postBuild(data: { buildOutput: string[] }): Promise<void>;
}
