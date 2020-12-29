import * as path from 'path';
import {
  FS,
  General,
  BCMSMostImageHandlerOptions,
  BCMSMostImageHandlerParseOptions,
} from './src/util';

interface ImageMap {
  [src: string]: Array<{
    options: {
      raw: string;
      parsed: BCMSMostImageHandlerOptions;
    };
  }>;
}

async function main(relativePath: string) {
  const basePath = path.join(process.cwd(), 'bcms', relativePath);
  const pages = (await FS.getHtmlFiles(relativePath)).map((e) =>
    e.replace(basePath, '').substring(1),
  );
  const imageMap: ImageMap = {};
  for (const i in pages) {
    const page = (
      await FS.read([...relativePath.split('/'), ...pages[i].split('/')])
    ).toString();
    const pictures = General.string.getAllTextBetween(
      page,
      '<div class="bcms-img"',
      '</div>',
    );
    for (const j in pictures) {
      const source = General.string.getTextBetween(
        pictures[j],
        'srcSet="',
        '"',
      );
      const original = General.string.getTextBetween(pictures[j], 'src="', '"');
      const optionsRaw = source.split('/')[1];
      const srcParts = source.split('.');
      const firstPart = srcParts.slice(0, srcParts.length - 1).join('.');
      const firstPartSplit = firstPart.split('-');
      const sizeIndex = parseInt(firstPartSplit[firstPartSplit.length - 1]);
      if (imageMap[original]) {
        if (!imageMap[original].find((e) => e.options.raw === optionsRaw)) {
          imageMap[original].push({
            options: {
              raw: optionsRaw,
              parsed: BCMSMostImageHandlerParseOptions(optionsRaw, sizeIndex),
            },
          });
        } else {
          imageMap[original] = [
            {
              options: {
                raw: optionsRaw,
                parsed: BCMSMostImageHandlerParseOptions(optionsRaw, sizeIndex),
              },
            },
          ];
        }
      }
    }
    console.log(imageMap);
  }
}
main('../../starters/bcms-gatsby-starter-blog/public').catch((error) => {
  console.error(error);
  process.exit(1);
});
