import type { BCMSTemplate } from '@becomes/cms-client/types';

export interface BCMSMostTemplateHandlerQuery {
  (item: BCMSTemplate, cache: BCMSTemplate[]): Promise<
    boolean | string | number | unknown
  >;
}

export interface BCMSMostTemplateHandler {
  findOne(query: BCMSMostTemplateHandlerQuery): Promise<BCMSTemplate | null>;
  find(query: BCMSMostTemplateHandlerQuery): Promise<BCMSTemplate[]>;
  pull(): Promise<void>;
}
