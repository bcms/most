import { createBcmsMost } from './main';

export async function main() {
  const most = createBcmsMost();
  await most.template.pull();
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
