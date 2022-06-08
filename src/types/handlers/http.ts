export interface BCMSMostHttpImageProcessAndResolveData {
  /**
   * Examples: /_se300x200-600xa/path/to/file_0.jpg
   */
  path: string;
}

export interface BCMSMostHttpHandler {
  image: {
    processAndResolve(
      data: BCMSMostHttpImageProcessAndResolveData,
    ): Promise<string>;
    processAndResolveToBuffer(
      data: BCMSMostHttpImageProcessAndResolveData,
    ): Promise<Buffer>;
  };
}
