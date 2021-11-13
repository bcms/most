export interface BCMSMostImageHandler {
  parseOptions(optionsRaw: string, sizeIndex: number): BCMSMostImageOptions;
  resolver(data: {
    rootExt?: string;
    rawOptions: string;
    path: string;
    pathToFile: string;
  }): Promise<BCMSMostImageResolverResponse>;
}
export interface BCMSMostImageResolverResponse {
  status: number;
  filePath?: string;
  message?: unknown;
}
export interface BCMSMostImageOptionsSize {
  width: number;
  height?: number;
}
export interface BCMSMostImageOptions {
  sizeIndex: number;
  step?: number;
  position?: string;
  quality?: number;
  sizes?: BCMSMostImageOptionsSize[];
}
