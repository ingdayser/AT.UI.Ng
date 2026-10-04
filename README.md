# AT.UI.Ng

Librerías de front compartidas de **Apoyos Tecnológicos (AT)**, la casa matriz. Se consumen por npm desde el SPA
Angular y desde la app móvil (Angular Native). Aquí va **solo lo transversal a todas las aplicaciones**: nada de
dominio de Apoyo Financiero (préstamos, clientes, pagos), que irá en `AF.UI.Ng`.

## Paquetes

| Paquete | Qué contiene | Depende de |
|---|---|---|
| `@at/ui-core` | TypeScript puro: envelope `ApiResponse<T>` + `unwrap`, paginación, modelos de sesión, `JwtHelper`, formatos es-CO (moneda, fechas, zona `America/Bogota`), mensajes de error | nada |
| `@at/ui-http` | `BaseHttpService` (devuelve el `result` ya desenvuelto), `LoadingStore` + `loadingInterceptor`, `httpErrorInterceptor` que avisa por `HTTP_ERROR_NOTIFIER` | `ui-core`; peers `@angular/{core,common}`, `@ngrx/signals`, `rxjs` |
| `@at/ui-auth` | `AuthStore` (restore, signIn, refresh compartido, signOut), `authInterceptor` (bearer + refresh en 401), `authGuard` / `loginGuard` con `returnUrl` | `ui-core`, `ui-http`; peer `@angular/router` además |

Cada app aporta lo que depende de la plataforma:

```ts
providers: [
  { provide: AUTH_CONFIG, useValue: { memberApiUrl: `${host}/api/v1.0/member`, apiBaseUrls: [host] } },
  { provide: AUTH_STORAGE, useExisting: AppSecureStorage },          // keychain/keystore o localStorage
  { provide: HTTP_ERROR_NOTIFIER, useValue: (notice) => showAlert(notice.message) },
  provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor, httpErrorInterceptor])),
]
```

En Angular Native, `provideNativeHttpClient(...)` configura el mismo `HttpClient` de Angular, así que los
interceptors y `BaseHttpService` funcionan igual que en el SPA.

## Reglas

- **Sin plataforma**: nada de `window`, `document`, `localStorage`, `HttpErrorResponse` ni módulos nativos. Lo que dependa
  de la plataforma entra por una interfaz que implementa cada app (p. ej. almacenamiento seguro).
- **Sin dominio**: si menciona un préstamo, un cliente o un pago, es de `AF.UI.Ng`.
- **Compatible con Hermes** (React Native): no usar `TextDecoder`, `Buffer` ni `atob`.
- Las clases de los paquetes Angular no llevan decoradores: stores (`signalStore`), funciones e `InjectionToken`s. Así se
  prueban con `TestBed` y no hace falta compilarlas con ng-packagr.
- Imports relativos con extensión `.ts`; se compila con `rewriteRelativeImportExtensions`.
- Los componentes visuales no se comparten: cada app tiene su UI.

## Comandos

```sh
npm install
npm run typecheck && npm run lint && npm test && npm run build
```

## Publicación (Azure Artifacts)

Feed de la organización: `https://pkgs.dev.azure.com/ApoyosTecnologicos/_packaging/ApoyosTecnologicos/npm/registry/`.
El `.npmrc` del repo manda el scope `@at` al feed, sin credenciales: cada desarrollador pone su PAT (permiso
*Packaging: Read & write* para publicar, *Read* para consumir) en el `~/.npmrc` de su usuario.

```sh
npm ci && npm run build && npm test
npm version patch -w @at/ui-core -w @at/ui-http -w @at/ui-auth   # sube las versiones
npm publish -w @at/ui-core -w @at/ui-http -w @at/ui-auth          # a mano, o con un tag `v*` en el pipeline
```

El pipeline (`azure-pipelines.yml`) compila y prueba en cada PR y publica al empujar un tag `v*`. Cada versión se
publica una sola vez. La identidad *Project Collection Build Service* necesita rol *Contributor* en el feed.

## Pendiente

- Verificar la URL del feed en *Artifacts → Connect to feed → npm* y conectar el pipeline a este repo de GitHub.
