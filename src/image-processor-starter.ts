import { ObjectUtility } from '@banez/object-utility';
import { ObjectUtilityError } from '@banez/object-utility/types';
import { createBcmsMost } from './main';

interface Args {
  mediaId?: string;
  inputBasePath?: string;
  outputBasePath?: string;
  optionsAsString?: string;
  config?: string;
}

export function parseArgs(rawArgs: string[]): Args {
  const args: {
    [key: string]: string;
  } = {};
  let i = 2;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];
    let value = '';
    if (rawArgs[i + 1]) {
      value = rawArgs[i + 1].startsWith('--') ? '' : rawArgs[i + 1];
    }
    args[arg] = value;
    if (value === '') {
      i = i + 1;
    } else {
      i = i + 2;
    }
  }
  function getArg<T extends string | boolean>(
    names: string[],
    type: 'string' | 'boolean',
  ): T | undefined {
    for (let j = 0; j < names.length; j++) {
      const name = names[j];
      if (args[name]) {
        if (type === 'string') {
          return args[name] as T;
        } else {
          return (args[name] === '' || args[name] === 'true' || false) as T;
        }
      }
    }
    if (type === 'string') {
      return args[names[0]] as T;
    } else {
      return (args[names[0]] === '' || args[names[0]] === 'true' || false) as T;
    }
  }
  const groupsRaw: {
    [name: string]: {
      type: 'string' | 'boolean';
    };
  } = {
    mediaId: {
      type: 'string',
    },
    inputBasePath: {
      type: 'string',
    },
    outputBasePath: {
      type: 'string',
    },
    optionsAsString: {
      type: 'string',
    },
    config: {
      type: 'string',
    },
  };
  const groups: {
    [name: string]: {
      name: string;
      type: 'string' | 'boolean';
    };
  } = {};
  for (const groupName in groupsRaw) {
    const groupRaw = groupsRaw[groupName];
    groups[groupName] = {
      name: groupName,
      type: groupRaw.type,
    };
  }
  const myArgs: {
    [name: string]: string;
  } = {
    '--mediaId': groups.mediaId.name,
    '--inputBasePath': groups.inputBasePath.name,
    '--outputBasePath': groups.outputBasePath.name,
    '--optionsAsString': groups.optionsAsString.name,
    '--config': groups.config.name,
  };
  const output: {
    [name: string]: string | boolean | undefined;
  } = {};
  const collectedArgs: {
    [group: string]: {
      names: string[];
      type: 'string' | 'boolean';
    };
  } = {};
  for (const argName in myArgs) {
    const groupName = myArgs[argName];
    const group = groups[groupName];
    if (!collectedArgs[groupName]) {
      collectedArgs[groupName] = {
        names: [argName],
        type: group.type,
      };
    } else {
      collectedArgs[groupName].names.push(argName);
    }
  }
  for (const group in collectedArgs) {
    const argData = collectedArgs[group];
    output[group] = getArg(argData.names, argData.type);
  }
  return output;
}

async function main() {
  const args = parseArgs(process.argv);
  const check = ObjectUtility.compareWithSchema(
    args,
    {
      mediaId: {
        __type: 'string',
        __required: true,
      },
      inputBasePath: {
        __type: 'string',
        __required: true,
      },
      outputBasePath: {
        __type: 'string',
        __required: true,
      },
      optionsAsString: {
        __type: 'string',
        __required: true,
      },
      config: {
        __type: 'string',
        __required: false,
      },
    },
    'args',
  );
  if (check instanceof ObjectUtilityError) {
    throw Error(check.message);
  }
  const most = createBcmsMost({
    config: args.config
      ? JSON.parse(Buffer.from(args.config, 'base64').toString())
      : undefined,
  });
  await most.imageProcessor.process({
    input: args.mediaId as string,
    inputBasePath: args.inputBasePath as string,
    outputBasePath: args.outputBasePath as string,
    optionsAsString: args.optionsAsString as string,
  });
}
main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
