import { Prop, PropParsed, PropType } from './props';

export interface EntryMeta {
  lng: string;
  props: Prop[];
}

export interface BCMSEntryContent {
  lng: string;
  props: Prop[];
}

export interface BCMSEntry {
  _id: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
  userId: string;
  meta: EntryMeta[];
  content: BCMSEntryContent[];
}

export interface BCMSEntryParsed<T> {
  _id: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
  userId: string;
  meta: {
    [lng: string]: T;
  };
  content: {
    [lng: string]: BCMSEntryContentParsed;
  };
}

export type BCMSEntryContentParsed = BCMSEntryContentParsedItem[];

export type BCMSEntryContentParsedItem = {
  type: PropType;
  value: PropParsed;
  name: string;
};
