import { StringUtility } from '@banez/string-utility';
import type { BCMSEntryParsed } from '@becomes/cms-client/types';
import type { BCMSMostCacheHandler, BCMSMostConfig } from '../types';

export async function bcmsMostEntryLinkParser(
  srcEntry: BCMSEntryParsed,
  entries: BCMSEntryParsed[],
  config: BCMSMostConfig,
  cache: BCMSMostCacheHandler,
): Promise<{ entry: BCMSEntryParsed; shouldUpdate: boolean }> {
  if (config.entries && config.entries.linkParser) {
    let srcEntryJson = JSON.stringify(srcEntry, null, '  ');
    const templateName = srcEntry.templateName;
    const entryLinks = StringUtility.allTextBetween(
      srcEntryJson,
      'href=\\"entry:',
      ':entry\\"',
    );
    let shouldUpdate = false;
    if (entryLinks.length > 0) {
      for (let j = 0; j < entryLinks.length; j++) {
        const link = entryLinks[j];
        const [eid, tid] = link.split('@*_');
        const targetEntry = entries.find((e) => e._id === eid);
        if (targetEntry) {
          srcEntryJson = srcEntryJson.replace(
            new RegExp(`entry:${eid}@\\*_${tid}@\\*_:entry`, 'g'),
            await config.entries.linkParser({
              link,
              targetEntry,
              srcEntry,
              srcTemplateName: templateName,
              cache,
            }),
          );
          shouldUpdate = true;
        }
      }
    }
    if (shouldUpdate) {
      return {
        entry: JSON.parse(srcEntryJson),
        shouldUpdate,
      };
    }
  }
  return {
    entry: srcEntry,
    shouldUpdate: false,
  };
}
