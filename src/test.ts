import { createBcmsMost } from './main';

export async function main() {
  const most = createBcmsMost();
  setInterval(() => {
    console.log(most.cache.content.find);
  }, 2000);
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
