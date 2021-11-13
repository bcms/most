import { SocketEventData, SocketEventName } from '@becomes/cms-client';
import { BCMSEntryParsed } from './cms';

export interface BCMSMostPipe {
  initialize(config: {
    onSocketEvent?: (data: {
      name: SocketEventName;
      data: SocketEventData;
      entry?: BCMSEntryParsed<unknown>;
    }) => Promise<void>;
  }): Promise<void>;
  postBuild(config: {
    relativePath: string;
    outputPath: string;
  }): Promise<void>;
}
