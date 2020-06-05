module.exports = {
  entries: [
    {
      name: 'stickers',
      parse: true,
      templateId: '5e46fdc1ce55ce5269b3d0f4',
      modify: async (entries) => {
        entries = entries
          .filter((e) => e.en.meta.available === true)
          .map((e) => {
            const en = e.en.meta;
            let sr = e.sr;
            delete en.notebook;
            if (sr && sr.meta && sr.meta.title !== '') {
              sr = sr.meta;
              delete sr.notebook;
            } else {
              sr = en;
            }
            return {
              en,
              sr,
            };
          });
        entries.sort((a, b) => {
          if (a.en.createdAt > b.en.createdAt) {
            return -1;
          } else if (a.en.createdAt < b.en.createdAt) {
            return 1;
          }
          return 0;
        });
        return entries;
      },
    },
    {
      name: 'blog',
      parse: true,
      templateId: '5e497c20d749fc0011f077d2',
      modify: async (entries) => {
        entries = entries
          .filter((e) => e.en.meta.draft !== true)
          .map((e) => {
            const en = e.en;
            let sr = e.sr;
            if (!sr || !sr.meta || sr.meta.title === '') {
              sr = en;
            }
            return {
              en,
              sr,
            };
          });
        entries.sort((a, b) => {
          if (a.en.meta.createdAt > b.en.meta.createdAt) {
            return -1;
          } else if (a.en.meta.createdAt < b.en.meta.createdAt) {
            return 1;
          }
          return 0;
        });
        return entries;
      },
    },
    {
      name: 'author',
      parse: true,
      templateId: '5e497c3bd749fc0011f077d4',
    },
    {
      name: 'page_content',
      parse: true,
      templateId: '5ea057ae53ba013ce28333a4',
      modify: async (entries) => {
        const result = {};
        entries.forEach((entry) => {
          result[
            entry.en.meta.title
              .toLowerCase()
              .replace(/ /g, '_')
              .replace(/-/g, '_')
          ] = entry;
        });
        return result;
      },
    },
  ],
  pageParser: {
    nuxt: [
      {
        entries: 'stickers',
        type: 'single',
        handler: async (item) => {
          return {
            output: `/${item.en.slug}`,
            data: item,
          };
        },
      },
    ],
  },
};
