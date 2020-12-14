import { BCMSMost } from './src';

const bcmsMost = BCMSMost({
  cms: {
    origin: process.env.BCMS_API_ORIGIN || 'http://localhost:1280',
    key: {
      id: process.env.BCMS_API_KEY || '5fd73d79fadde5670e9565d3',
      secret:
        process.env.BCMS_API_SECRET ||
        '43dc5a917c9b46c4f2566cd705433f961565fb6c96842a5e79b2d9c33c94d413',
    },
  },
  entries: [],
  media: {
    output: '',
  },
});

async function main() {
  process.env.DEBUG='*';
  console.log('a');
  await bcmsMost.client.socket.connect({
    url: 'http://localhost:1280',
    path: '/api/socket/server/',
  });
  console.log('HERE');
  bcmsMost.client.socket.subscribe((data) => {
    console.log(data);
  });
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
