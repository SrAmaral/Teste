import { initFederation } from '@angular-architects/native-federation';

// O shell não pré-carrega remotes: cada rota carrega o seu (ver federation/remote-loader.ts), isolando falhas.
initFederation({}, { hostRemoteEntry: { url: './remoteEntry.json' } })
  .catch((err) => console.error(err))
  .then(() => import('./bootstrap'))
  .catch((err) => console.error(err));
