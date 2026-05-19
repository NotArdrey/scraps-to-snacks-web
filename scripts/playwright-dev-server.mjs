import { createServer } from 'vite';

process.env.VITE_VISUAL_DOCS = 'true';

const port = Number(process.env.PLAYWRIGHT_PORT || 5199);

const server = await createServer({
  server: {
    host: '127.0.0.1',
    port,
    strictPort: true,
  },
});

await server.listen();
server.printUrls();

const close = async () => {
  await server.close();
  process.exit(0);
};

process.on('SIGINT', close);
process.on('SIGTERM', close);
