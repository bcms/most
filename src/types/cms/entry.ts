import { Prop, PropParsed, PropType } from './props';

export interface BCMSEntryMeta {
  lng: string;
  props: Prop[];
}
export interface BCMSEntryContent {
  lng: string;
  props: Prop[];
}
export type BCMSEntryContentParsed = BCMSEntryContentParsedItem[];
export type BCMSEntryContentParsedItem = {
  type: PropType;
  value: PropParsed;
  name: string;
};
export interface BCMSEntry {
  _id: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
  userId: string;
  meta: BCMSEntryMeta[];
  content: BCMSEntryContent[];
}
export interface BCMSEntryMetaParsed {
  [lng: string]: {
    [name: string]: PropParsed;
  };
}
export interface BCMSEntryParsed {
  _id: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
  userId: string;
  meta: BCMSEntryMetaParsed;
  content: {
    [lng: string]: BCMSEntryContentParsed;
  };
}
