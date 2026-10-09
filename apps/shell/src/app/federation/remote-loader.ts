import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { RemoteIndisponivel } from './remote-indisponivel';

type CarregadorDeModulo = () => Promise<Record<string, unknown>>;

let manifest: Promise<Record<string, string>> | undefined;

function carregarManifest(): Promise<Record<string, string>> {
  manifest ??= fetch('federation.manifest.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} ao ler federation.manifest.json`);
      return res.json() as Promise<Record<string, string>>;
    })
    .catch((err) => {
      manifest = undefined;
      throw err;
    });
  return manifest;
}

export async function carregarDoManifest(remoteName: string, exposedModule: string): Promise<Record<string, unknown>> {
  const remoteEntry = (await carregarManifest())[remoteName];
  if (!remoteEntry) throw new Error(`Remote "${remoteName}" não está no federation.manifest.json`);
  return loadRemoteModule({ remoteName, remoteEntry, exposedModule });
}

export function rotasRemotas(
  remoteName: string,
  exportName: string,
  loader: CarregadorDeModulo = () => carregarDoManifest(remoteName, './routes'),
): () => Promise<Routes> {
  return async () => {
    try {
      const modulo = await loader();
      const rotas = modulo[exportName];
      if (!Array.isArray(rotas)) throw new Error(`"${exportName}" não foi exportado por ${remoteName}`);
      return rotas as Routes;
    } catch (err) {
      console.error(`[shell] falha ao carregar ${remoteName}`, err);
      return [{ path: '**', component: RemoteIndisponivel, data: { remoteName } }];
    }
  };
}
