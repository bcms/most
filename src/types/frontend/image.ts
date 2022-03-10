export interface BCMSImageHandler {
  parsable: boolean;
  optionString: string;
  getSrcSet(options?: {
    width: number;
    height?: number;
  }): [string, string, number, number];
}
