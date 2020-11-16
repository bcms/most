import { Prop, PropParsed, PropType } from './props';

export interface EntryMeta {
  lng: string;
  props: Prop[];
}

export interface EntryContent {
  lng: string;
  props: Prop[];
}

export interface Entry {
  _id: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
  userId: string;
  meta: EntryMeta[];
  content: EntryContent[];
}

export interface EntryParsed {
  _id: string;
  createdAt: number;
  updatedAt: number;
  templateId: string;
  userId: string;
  meta: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [lng: string]: any;
  };
  content: {
    [lng: string]: EntryContentParsed;
  };
}

export type EntryContentParsed = EntryContentParsedItem[];

export type EntryContentParsedItem = {
  type: PropType;
  value: PropParsed;
  name: string;
};
