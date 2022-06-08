import { BCMSMostConsole, ConsoleColors } from '../types';

export function createBcmsMostConsole(component: string): BCMSMostConsole {
  return {
    info(place, message) {
      let print = '';
      if (typeof message === 'object') {
        print = `\r\n${ConsoleColors.FgYellow}${JSON.stringify(
          message,
          null,
          2,
        )}${ConsoleColors.Reset}`;
      } else {
        print = `${message}`;
      }
      const output: string[] = [
        `${ConsoleColors.BgWhite}${ConsoleColors.FgBlack}[WARN]${ConsoleColors.Reset}`,
        `[${ConsoleColors.FgCyan}${new Date().toLocaleString()}${
          ConsoleColors.Reset
        }]`,
        `${ConsoleColors.Bright}${ConsoleColors.FgMagenta}${component}${ConsoleColors.Reset}`,
        `${ConsoleColors.FgMagenta}${place}${ConsoleColors.Reset}`,
        '>',
        print,
      ];
      return output.join(' ');
    },
    warn(place, message) {
      let print = '';
      if (typeof message === 'object') {
        print = `\r\n${ConsoleColors.FgYellow}${JSON.stringify(
          message,
          null,
          2,
        )}${ConsoleColors.Reset}`;
      } else {
        print = `${message}`;
      }
      const output: string[] = [
        `${ConsoleColors.BgYellow}${ConsoleColors.FgBlack}[WARN]${ConsoleColors.Reset}`,
        `[${ConsoleColors.FgCyan}${new Date().toLocaleString()}${
          ConsoleColors.Reset
        }]`,
        `${ConsoleColors.Bright}${ConsoleColors.FgMagenta}${component}${ConsoleColors.Reset}`,
        `${ConsoleColors.FgMagenta}${place}${ConsoleColors.Reset}`,
        '>',
        print,
      ];
      return output.join(' ');
    },
    error(place, message) {
      let print = '';
      if (typeof message === 'object') {
        let stack: string | undefined;
        if (message instanceof Error && message.stack) {
          stack = message.stack;
          delete message.stack;
        }
        print = `\r\n${ConsoleColors.FgRed}${JSON.stringify(message, null, 2)}${
          ConsoleColors.Reset
        }`;
        if (stack) {
          print =
            print + `\r\n${ConsoleColors.FgRed}${stack}${ConsoleColors.Reset}`;
        }
      } else {
        print = `${message}`;
      }
      const output: string[] = [
        `${ConsoleColors.BgRed}${ConsoleColors.FgBlack}[ERROR]${ConsoleColors.Reset}`,
        `[${ConsoleColors.FgCyan}${new Date().toLocaleString()}${
          ConsoleColors.Reset
        }]`,
        `${ConsoleColors.Bright}${ConsoleColors.FgMagenta}${component}${ConsoleColors.Reset}`,
        `${ConsoleColors.FgMagenta}${place}${ConsoleColors.Reset}`,
        '>',
        print,
      ];
      return output.join(' ');
    },
  };
}
