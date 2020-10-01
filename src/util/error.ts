import { ConsoleColors } from './console';

export interface ErrorHandlerPrototype {
  get(message: string): Error;
}

function errorHandler(): ErrorHandlerPrototype {
  return {
    get(message) {
      return Error(
        `${ConsoleColors.FgMagenta}[${new Date().toLocaleString()}] ${
          ConsoleColors.FgRed
        }${message}${ConsoleColors.Reset}`,
      );
    },
  };
}

export const ErrorHandler = errorHandler();
