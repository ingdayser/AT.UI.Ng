# AT.UI.Ng

Librerías de front compartidas de **Apoyos Tecnológicos (AT)**, la casa matriz. Se consumen por npm desde el SPA
Angular y desde la app móvil (Angular Native). Aquí va **solo lo transversal a todas las aplicaciones**: nada de
dominio de Apoyo Financiero (préstamos, clientes, pagos), que irá en `AF.UI.Ng`.

## Paquetes

| Paquete | Qué contiene | Depende de |
|---|---|---|
| `@at/ui-core` | TypeScript puro: envelope `ApiResponse<T>` + `unwrap`, paginación, modelos de sesión, `JwtHelper`, formatos es-CO (moneda, fechas, zona `America/Bogota`), mensajes de error | nada |

Previstos: `@at/ui-http` (`BaseHttpService`, interceptors) y `@at/ui-auth` (`AuthStore`, guards), con `@angular/*` como
`peerDependencies`.

## Reglas

- **Sin plataforma**: nada de `window`, `document`, `localStorage`, `HttpErrorResponse` ni módulos nativos. Lo que dependa
  de la plataforma entra por una interfaz que implementa cada app (p. ej. almacenamiento seguro).
- **Sin dominio**: si menciona un préstamo, un cliente o un pago, es de `AF.UI.Ng`.
- **Compatible con Hermes** (React Native): no usar `TextDecoder`, `Buffer` ni `atob`.
- Imports relativos con extensión `.ts`; se compila con `rewriteRelativeImportExtensions`.
- Los componentes visuales no se comparten: cada app tiene su UI.

## Comandos

```sh
npm install
npm run typecheck && npm run lint && npm test && npm run build
```

## Pendiente

- Registro npm donde se publica y su alcance (`@at`): por confirmar. Mientras tanto se puede consumir con `file:` o `npm link`.
