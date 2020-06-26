import { BCMSMedia } from "@becomes/cms-client";

export interface MediaCache {
  hash: string;
  timestamp: number;
  media: BCMSMedia[];
}