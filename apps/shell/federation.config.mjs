import {
  withNativeFederation,
  fromPackageJson,
  share,
} from '@angular-architects/native-federation/config';

const config = withNativeFederation({
  name: 'shell',

  shared: fromPackageJson({
    singleton: true,
    strictVersion: true,
    requiredVersion: 'auto',
    build: 'package',
  })
    // includeSecondaries is an opt-out of ignoreUnusedDeps, so all of
    // @angular/core is shared to prevent mismatches.
    .patch(['@angular/core'], { includeSecondaries: { keepAll: true } }),

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    '@safra/shared',
    // dependem de @angular/animations (não usado — Material 22 dispensa)
    '@angular/platform-browser/animations',
    '@angular/platform-browser/animations/async',
    // entry points de build/testes, não usados no navegador
    /\/(schematics|testing)(\/|$)/,
    'mermaid',
    // Add further packages you don't need at runtime
  ],

  // Please read our FAQ about sharing libs:
  // https://shorturl.at/jmzH0

  features: {
    // Desligado: a análise de deps (sheriff) não aceita imports fora da pasta do app (libs/shared).
    ignoreUnusedDeps: false,

    // Opt-in: groups chunks in remoteEntry.json for smaller metadata file
    denseChunking: true,
  },
});

// Com ignoreUnusedDeps=false o NF remove os locales do shared, mas o esbuild ainda trata
// '@angular/common/locales/pt' como external (subpath de '@angular/common'). Re-adiciona o pt-BR
// para ele entrar no import map.
Object.assign(
  config.shared,
  withNativeFederation({
    name: 'locales',
    features: { ignoreUnusedDeps: true },
    shared: share({
      '@angular/common/locales/pt': { singleton: true, strictVersion: true, requiredVersion: 'auto', includeSecondaries: false },
    }),
  }).shared,
);

export default config;
