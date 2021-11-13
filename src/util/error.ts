import { ConsoleColors } from "@becomes/purple-cheetah";

export function ErrorHandler(message: string): Error {
  return Error(
    `${ConsoleColors.FgMagenta}[${new Date().toLocaleString()}] ${
      ConsoleColors.FgRed
    }${message}${ConsoleColors.Reset}`,
  );
}
