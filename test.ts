import { BCMS } from './src';

const bcms = new BCMS({ origin: 'https://cms.hugzie.xyz', key: '5e46fa38ce55ce5269b3d0d7', secret: '81yp5oiYSD73JAfFnc5qg21ctDdgIyQG' });
bcms
  .pullContent()
  .then(() => {
    console.log('Done');
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
