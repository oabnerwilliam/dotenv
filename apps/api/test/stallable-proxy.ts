import { once } from 'node:events';
import { connect, createServer, type AddressInfo, type Socket } from 'node:net';

// Proxy TCP entre a API e o Postgres, para simular uma conexão que trava: o banco para de
// responder, mas o TCP não é fechado, então o driver não recebe erro nenhum.
export async function startStallableProxy(targetUrl: string) {
  const target = new URL(targetUrl);
  const pairs: { client: Socket; upstream: Socket }[] = [];

  const server = createServer((client) => {
    const upstream = connect(Number(target.port || 5432), target.hostname);
    pairs.push({ client, upstream });
    client.pipe(upstream);
    upstream.pipe(client);
    // Fechar uma ponta fecha a outra; o erro em si não interessa ao teste.
    client.on('error', () => upstream.destroy());
    upstream.on('error', () => client.destroy());
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');

  const url = new URL(target);
  url.hostname = '127.0.0.1';
  url.port = String((server.address() as AddressInfo).port);

  return {
    /** A mesma URL do banco, passando pelo proxy. */
    url: url.href,

    /** Para de repassar dados nas conexões já abertas, sem fechá-las. Conexões novas funcionam. */
    stallOpenConnections(): void {
      for (const { client, upstream } of pairs) {
        client.unpipe(upstream);
        upstream.unpipe(client);
        // Continua lendo e descarta, como pacotes que se perdem no caminho.
        client.resume();
        upstream.resume();
      }
    },

    async close(): Promise<void> {
      for (const { client, upstream } of pairs) {
        client.destroy();
        upstream.destroy();
      }
      server.close();
      await once(server, 'close');
    },
  };
}
