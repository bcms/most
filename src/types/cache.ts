import { ObjectSchema } from './object-schema';

export interface BCMSMostCacheContent {
  [name: string]: BCMSMostCacheContentItem[];
}
export interface BCMSMostCacheContentItem {
  _id: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
}
export const BCMSMostCacheContentItemSchema: ObjectSchema = {
  _id: {
    __type: 'string',
    __required: true,
  },
  createdAt: {
    __type: 'number',
    __required: true,
  },
  updatedAt: {
    __type: 'number',
    __required: true,
  },
  templateId: {
    __type: 'string',
    __required: true,
  },
};
export interface BCMSMostFunctionCache {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [name: string]: any;
}