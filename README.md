# BCMS - Static Site Generator Framework Tool Set

This is a tool set that will abstract communication with a BCMS API and will allow easier integration in the frameworks like Gatsby and Nuxt. It is important to have in mind that this is an abstraction tool and all of its functionality can be achieved using [Becomes CMS Client](https://github.com/becomesco/cms-client) library and NodeJS runtime.

## Implementation

There are versions of this package implemented for few major frameworks shown below. If you favorite framework is not on the list you can do custom implementation or make a request.

### Gatsby

Follow the instruction of the Gatsby [github repository](https://github.com/becomesco/gatsby-source-bcms),

### Nuxt

Follow the instructions of the Nuxt [github repository](https://github.com/becomesco/nuxt-plugin-bcms),

### Sapper

Follow the instructions of the Sapper [github repository](https://github.com/becomesco/sapper-plugin-bcms),

### Custom Implementation

Easiest way to create a custom implementation is by using `pipe` object exposed by the `BCMSMost`. There are to functions exposed by the pipe object:

- **initialize** - is a function which should be called in production build and local development. It will initialize all required handlers and caches, and it will pull all data from the BCMS. This is useful because all files will be stored locally making data access very fast and cache control easy. In addition, this function will also connect to the BCMS socket, which enables live reload and content update when content in the BCMS is changed.
- **postBuild** - is a function which should be called in production after the build process is completed (after final pages of the site are generated). It will look at a target directory and find all HTML files, look into them and pull all important data. One type of this sort of data is image options, required by the image processor.

If this two functions are not enough, it is possible to tap into the BCMS Most API and create custom implementation from the scratch. For more information about the API, please see [typedoc](https://thebcms.com/docs/typedoc/cms-most).

#### Reference implementation

Before starting a development server of production build, initialize BCMS Most.

```js
import { BCMSMost } from '@becomes/cms-most';

const bcmsMost = BCMSMost();
bcmsMost.pipe
  .initialize(3001, (name, data, entry) => {
    /**
     * Do something when entry in the BCMS is updated,
     * deleted or added. For example, development server
     * can be reloaded on entry update to see live
     * changes on the page.
     */
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

After production build is completed and all pages of the website are created it is important to call `postBuild` function from the pipe object. This is required if BCMS Most image server is used.

```js
// ......

bcmsMost.pipe.postBuild('relative/path/to/website/files').catch((error) => {
  console.error(error);
  process.exit(1);
});
```
