import { ConsoleColors } from './logger';

export class ErrorHandler {
  public static throw(message: any) {
    return new Error(
      `${ConsoleColors.FgMagenta}[${new Date().toLocaleString()}] ${
        ConsoleColors.FgRed
      }${message}${ConsoleColors.Reset}`,
    );
  }
}
