# Becomes CMS - Static Site Generator Framework

This is a tool that will abstract communication with Becomes CMS API and will allow easier integration in the framework like Gatsby and Nuxt. Have in mind that this is abstraction tool and all of its functionality can be achieved using [Becomes CMS Client](https://github.com/becomesco/cms-client) library.

## Getting started

Install tool as a development dependency by running `npm i -D @becomes/cms-ssgf`.
After this go to `package.json` and add scripts:

```json
{
  // ...
  "scripts": {
    // ...
    "bcms:pull-content": "bcms-ssgf --pull-content",
    "bcms:page-parser": "bcms-ssgf --page-parser",
    "bcms:pull-media": "bcms-ssgf --pull-media"
  }
}
```

Now you will need to create a configuration file called `bcms.config.js` in the root of the project (where `package.json` is). Inside of it, export configuration object. You can use configuration builder class to have autocomplete.

```js
import { ConfigBuilder } from '@becomes/cms-ssgf';

export default ConfigBuilder.build({
  // >>> Your configuration <<<
})
```