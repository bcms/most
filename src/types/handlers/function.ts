export interface BCMSMostFunctionHandler {
  call(name?: string): Promise<void>;
}