import * as fs from 'fs';
import * as util from 'util';
import * as path from 'path';
import * as sharp from 'sharp';
// import { General } from './util';

async function main() {
  await sharp(
    await util.promisify(fs.readFile)(path.join(process.cwd(), 'test.jpg')),
  )
    .resize({
      width: 50,
      height: 100,
      fit: 'cover',
    })
    .jpeg({
      quality: 70,
    })
    .toFile(path.join(process.cwd(), 'test-out.jpg'));
  // await General.exec(
  //   'bcms-most --media-processor --media-image 7b22696e70757450617468223a222e2e2f7374617469632f6d656469612f636f6d70616e6965732f656c6c612d64652d6b726f73732d3575666f65397668612d302d756e73706c6173682e6a7067222c226f757470757450617468223a222e2e2f7374617469632f6d656469612f5f7374615f7073615f716c615f737a77343030683230302d77383030683430302f636f6d70616e6965732f656c6c612d64652d6b726f73732d3575666f65397668612d302d756e73706c6173682d312e6a7067222c226f7074696f6e73526177223a225f7374615f7073615f716c615f737a77343030683230302d7738303068343030222c226f7074696f6e73223a7b2273697a65496e646578223a312c22706f736974696f6e223a2261222c2273697a6573223a5b7b227769647468223a3430302c22686569676874223a3230307d2c7b227769647468223a3830302c22686569676874223a3430307d5d7d7d',
  //   (type, chunk) => {
  //     process[type].write(chunk);
  //   },
  // );
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
