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

## Pendiente

- Registro npm donde se publica y su alcance (`@at`): por confirmar. Mientras tanto se puede consumir con `file:` o `npm link`.
