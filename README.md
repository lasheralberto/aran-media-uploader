<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Aran Media Uploader

Galeria privada para compartir fotos y videos con Firebase Storage.

## Requisitos

- Node.js
- Un proyecto de Firebase con Authentication y Storage activos

## Configuracion de Firebase Authentication

1. En Firebase Console, activa Authentication.
2. Habilita el proveedor Anonymous.
3. Anade los dominios desde los que vayas a abrir la app en Authorized domains.
4. Publica las reglas de Storage de este repositorio para exigir usuario autenticado.

## Desarrollo local

1. Instala dependencias con `npm install`.
2. Arranca la app con `npm run dev`.
3. Entra con cualquier email y la clave compartida `bodorrio` para acceder a la galeria.
