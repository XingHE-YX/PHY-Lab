// A production registration can survive when its origin starts serving Vite.
// Serve valid JavaScript at the same URL so that registration can retire itself.
export const developmentWorker = `
const scope = new URL(self.registration.scope);
async function projectClients() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  return clients.filter(client => {
    const url = new URL(client.url);
    return url.origin === scope.origin && url.pathname === scope.pathname;
  });
}
function prepare(client) {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); resolve(); }, 1000);
    channel.port1.onmessage = () => {
      clearTimeout(timer);
      channel.port1.close();
      resolve();
    };
    client.postMessage({ type: 'PREPARE_UPDATE' }, [channel.port2]);
  });
}
self.addEventListener('install', event => event.waitUntil((async () => {
  await Promise.all((await projectClients()).map(prepare));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const clients = await projectClients();
  await self.registration.unregister();
  await Promise.allSettled(clients.map(client => client.navigate(client.url)));
})()));
self.addEventListener('message', event => {
  event.ports[0]?.postMessage({ state: 'dev', complete: 0, total: 0, version: '', buildId: '', error: '' });
});
`;
