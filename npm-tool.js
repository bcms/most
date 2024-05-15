const { createConfig } = require('@banez/npm-tool');
const { createFS } = require('@banez/fs');
const { ChildProcess } = require('@banez/child_process');

const fs = createFS({
  base: process.cwd(),
});

/**
 *
 * @param {{
 *  dirPath: string[];
 *  basePath: string;
 *  endsWith?: string[];
 *  regex: RegExp[];
 * }} config
 * @returns {Promise<void>}
 */
async function fileReplacer(config) {
  const filePaths = await fs.fileTree(config.dirPath, '');
  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    if (
      config.endsWith &&
      !!config.endsWith.find((e) => filePath.path.abs.endsWith(e))
    ) {
      let replacer = config.basePath;
      if (filePath.dir !== '') {
        const depth = filePath.dir.split('/').length;
        replacer =
          new Array(depth).fill('..').join('/') + '/' + config.basePath;
      } else {
        replacer = './';
      }
      const file = await fs.readString(filePath.path.abs);
      let fileFixed = file + '';
      for (let j = 0; j < config.regex.length; j++) {
        const regex = config.regex[j];
        fileFixed = fileFixed.replace(regex, replacer);
      }
      if (file !== fileFixed) {
        await fs.save(filePath.path.abs, fileFixed);
      }
    }
  }
}

module.exports = createConfig({
  bundle: {
    override: [
      {
        title: 'Cleanup',
        task: async () => {
          if (await fs.exist('dist')) {
            await fs.deleteDir('dist');
          }
        },
      },
      {
        title: 'Build MJS',
        task: async () => {
          await ChildProcess.spawn('npm', ['run', 'build:ts:mjs']);
          const files = await fs.fileTree(['dist', 'mjs'], '');
          // await fileReplacer({
          //   basePath: '',
          //   dirPath: ['dist', 'mjs'],
          //   regex: [/@becomes\/cms-most\//g],
          //   endsWith: ['.d.ts'],
          // });
          for (let i = 0; i < files.length; i++) {
            const fileInfo = files[i];
            if (fileInfo.path.rel.endsWith('.d.ts')) {
              const rPath = fileInfo.path.rel.split('/');
              await fs.move(['dist', 'mjs', ...rPath], ['dist', ...rPath]);
            } else if (fileInfo.path.rel.endsWith('.js')) {
              await fs.move(
                ['dist', 'mjs', ...fileInfo.path.rel.split('/')],
                [
                  'dist',
                  ...fileInfo.path.rel.replace('.js', '.mjs').split('/'),
                ],
              );
            }
          }
          await fs.deleteDir(['dist', 'mjs']);
        },
      },
      {
        title: 'Build CJS',
        task: async () => {
          await ChildProcess.spawn('npm', ['run', 'build:ts:cjs']);
          // await fileReplacer({
          //   basePath: '',
          //   dirPath: ['dist', 'cjs'],
          //   regex: [/@becomes\/cms-most\//g],
          //   endsWith: ['.js'],
          // });
          const files = await fs.fileTree(['dist', 'cjs'], '');
          for (let i = 0; i < files.length; i++) {
            const fileInfo = files[i];
            if (fileInfo.path.rel.endsWith('.js')) {
              await fs.move(
                ['dist', 'cjs', ...fileInfo.path.rel.split('/')],
                [
                  'dist',
                  ...fileInfo.path.rel.replace('.js', '.cjs').split('/'),
                ],
              );
            }
          }
          await fs.deleteDir(['dist', 'cjs']);
        },
      },
      {
        title: 'Copy static files',
        task: async () => {
          await fs.copy('README.md', ['dist', 'README.md']);
          await fs.copy('LICENSE', ['dist', 'LICENSE']);
        },
      },
      {
        title: 'Update package.json',
        task: async () => {
          const packageJson = JSON.parse(await fs.readString('package.json'));
          packageJson.devDependencies = undefined;
          packageJson.scripts = undefined;
          packageJson.exports = {
            '.': {
              require: './index.cjs',
              import: './index.mjs',
            },
          };
          let files = await fs.fileTree(['dist'], '');
          for (let i = 0; i < files.length; i++) {
            const fileInfo = files[i];
            if (
              fileInfo.path.rel !== 'index.cjs' &&
              fileInfo.path.rel.endsWith('.cjs')
            ) {
              packageJson.exports[
                './' +
                  fileInfo.path.rel
                    .replace('/index.cjs', '')
                    .replace('.cjs', '')
              ] = {
                require: './' + fileInfo.path.rel,
                import: './' + fileInfo.path.rel.replace('.cjs', '.mjs'),
              };
            }
          }
          await fs.save(
            ['dist', 'package.json'],
            JSON.stringify(packageJson, null, 4),
          );
        },
      },
    ],
  },
});
