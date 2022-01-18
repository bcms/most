import { createBcmsMost } from './main';

export async function main() {
  const most = createBcmsMost({
    config: {
      cms: {
        origin: 'http://localhost:8080',
        key: {
          id: '61e6d049b3cbaa77fdb36f77',
          secret:
            '931e85ff9a646a72e197d3927c2461a100fe4fc1a7d13ac6614d3730fff85b53',
        },
      },
      functions: {
        call: [
          async () => {
            return {
              name: 'test2',
              payload: {},
            };
          },
        ],
      },
    },
  });
  await most.media.pull();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
