import { Arg } from './util/arg';
import { BCMS } from './bcms';
import { ProcessMedia } from './process-media';

export async function cli(args: string[]) {
  const options = Arg.parse(args);
  let bcms: BCMS;
  if (options.apiKey && options.apiSecret && options.apiOrigin) {
    bcms = new BCMS({
      key: options.apiKey,
      secret: options.apiSecret,
      origin: options.apiOrigin,
    });
  } else {
    bcms = new BCMS({
      key: process.env.BCMS_API_KEY,
      secret: process.env.BCMS_API_SECRET,
      origin: process.env.BCMS_API_ORIGIN,
    });
  }
  if (options.pullContent === true) {
    await bcms.pullContent();
  } else if (options.pullMedia === true) {
    await bcms.pullMedia();
  } else if (typeof options.processMedia === 'string') {
    const media = JSON.parse(
      Buffer.from(options.processMedia, 'base64').toString(),
    );
    await ProcessMedia.now(media);
  } else if (options.pageParser === true) {
    await bcms.pageParser();
  }
}
