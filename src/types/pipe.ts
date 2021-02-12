import { SocketEventData, SocketEventName } from '@becomes/cms-client';
import { BCMSEntryParsed } from './cms';

export interface BCMSMostPipe {
  initialize(
    imageServerPort?: number,
    onSocketEvent?: (
      name: SocketEventName,
      data: SocketEventData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      entry: BCMSEntryParsed<any>,
    ) => Promise<void>,
  ): Promise<void>;
  postBuild(relativePath: string, imageServerPort?: number): Promise<void>;
}