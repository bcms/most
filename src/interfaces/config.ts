export interface PageParserNuxtOutput {
  output: string;
  data: any | any[];
}

export interface PageParserNuxt {
  entries: string;
  type: 'many' | 'single';
  handler: (
    items: any[] | any,
  ) => Promise<PageParserNuxtOutput | PageParserNuxtOutput[] | void>;
}

export interface PageParserGatsby {
  page: string;
  handler: (createPage: any, component: any, bcms: any) => Promise<void>;
}
export interface MediaSizeMap {
  width: number;
  /** Default is 50 */
  quality?: number;
}

export interface Config {
  entries: Array<{
    name: string;
    parse: boolean;
    templateId: string;
    modify: (entries: any) => Promise<any>;
  }>;
  functions?: Array<{
    name: string;
    payload?: any;
    modify?: (response: any) => Promise<any>;
  }>;
  media: {
    ppc?: number;
    process?: boolean;
    sizeMap?: MediaSizeMap[];
    failOnError?: boolean;
    output: string;
  };
  pageParser?: {
    nuxt?: PageParserNuxt[];
    gatsby?: PageParserGatsby[];
  };
}
