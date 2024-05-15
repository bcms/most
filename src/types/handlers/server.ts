import type { ControllerMethodType } from '@becomes/purple-cheetah/types';
import type { BCMSMost } from '@becomes/cms-most/types/main';

export interface BCMSMostServerRoute<Result = unknown, Body = unknown> {
  method: ControllerMethodType;
  handler(data: {
    url: string;
    params: {
      [name: string]: string;
    };
    query: {
      [name: string]: string;
    };
    headers: {
      [name: string]: string | string[] | undefined;
    };
    body: Body;
    bcms: BCMSMost;
  }): Promise<Result>;
}
export interface BCMSMostServerRoutes {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [name: string]: BCMSMostServerRoute<any, any>;
}

export interface BCMSMostServerHandler {
  start(routes?: BCMSMostServerRoutes): Promise<void>;
  stop(): Promise<void>;
}
