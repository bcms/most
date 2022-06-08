# BCMS Most

This project is connecting [BCMS Client](https://github.com/becomesco/cms-client) and [BCMS Backend API](https://github.com/becomesco/cms-backend) and providing useful tools for website frameworks like [Gatsby](https://www.gatsbyjs.com/), [Nuxt](https://nuxtjs.org/) and [Next](https://nextjs.org/).

## Framework implementations

BCMS Most has its implementation for 3 major frameworks at the moment (this number increase over time):

- GatsbyJS - [gatsby-source-bcms](https://www.npmjs.com/package/gatsby-source-bcms)
- NextJS - [next-plugin-bcms](https://www.npmjs.com/package/next-plugin-bcms)
- NuxtJS - [nuxt-plugin-bcms](https://www.npmjs.com/package/nuxt-plugin-bcms)

Those packages are just wrappers around the BCMS Most. If your favorite framework is not listed, you can always make custom implementation using BCMS Most API.

## [API Documentation]()

```ts
import { createBcmsMost } from '@becomes/cms-most';

async function main() {
  const most =
    /**
     * You can provide client and configuration object
     * if you have them. If not, the BCMS Most will
     * create a client get configuration from `bcms.config.js`
     * file located at PWD location.
     */
    createBcmsMost();

  await most.content.pull();
  console.log(
    await most.content.entry.findOne(
      'my_template',
      async (item) => item.meta.en.slug === 'my_entry_slug',
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```
