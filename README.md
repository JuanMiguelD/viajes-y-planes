# 💞 Nuestros planes

App para organizar nuestros planes en pareja: checklist, mapa de lugares, planes para repetir y un álbum con las fotos de cada plan. La dirección visual está en [DESIGN.md](DESIGN.md).

- **Planes**: checklist agrupado en "Con fecha", "Sin fecha" y "Cumplidos". La categoría se indica con un icono (corazón para los dos, personas para los amigos). Las fechas que vencen en 7 días o menos, o que ya vencieron, salen en ocre.
- **Mapa**: los marcadores rellenos son planes hechos y los huecos, pendientes. Los marcadores cercanos se agrupan. Al tocar uno aparece un panel con la foto del plan.
- **Para repetir**: planes hechos que queremos volver a hacer, ordenados por el tiempo que llevan sin repetirse.
- **Álbum**: polaroids por mes, una por plan cumplido, y una página por plan con todas sus fotos. Con "Subir fotos" eliges de qué plan son; si el plan seguía pendiente, se marca como cumplido. Cada plan guarda sus fotos aparte (Firebase Storage, carpeta `plans/{id}/`).

El mapa base es de [OpenFreeMap](https://openfreemap.org) (gratuito, sin API key ni tarjeta) y la búsqueda de lugares usa OpenStreetMap Nominatim.

Todas las secciones leen el mismo estado (Firestore en tiempo real). Un cambio en una se ve al instante en las demás, y también en el móvil de la otra persona.

## Arrancar

```bash
npm install
npm run dev
```

Sin configurar Firebase funciona en **modo local**: los planes y las fotos se guardan solo en ese navegador (localStorage e IndexedDB). Sirve para probar.

## Configurar Firebase

1. Crea un proyecto en <https://console.firebase.google.com>.
2. Activa **Authentication → Google**, **Firestore Database** y **Storage**. Ojo: desde 2024, Firebase pide el plan **Blaze** (con tarjeta) para usar Storage. Mientras no pasen de la cuota gratuita (5 GB de fotos) no cobra nada; conviene crear una alerta de presupuesto de 1 USD en Google Cloud para estar tranquilos.
3. Añade una app web y copia su configuración: `cp .env.example .env.local` y rellena los valores.
4. Crea la lista de acceso. En **Firestore Database → Datos**, crea la colección `config` con un documento de ID `acceso` y un campo `correos` de tipo **array** que tenga los dos correos de Google. Esta lista **no está en el código** (el repo es público): solo se edita desde la consola, y para dar o quitar acceso basta con cambiarla.
5. Inicia sesión en la CLI de Firebase (viene con el proyecto): `npx firebase login`.

## Publicar

```bash
npm run deploy
```

Publica la web y las reglas en `https://viajesyplanes-5ba1d.web.app`, siempre en este orden:

1. Corre los tests de las reglas (`npm run test:rules`) en emuladores locales. Si alguno falla, no se publica nada.
2. Revisa que `.env.local` tenga todas las variables y apunte al mismo proyecto (`scripts/check-deploy.mjs`), para no publicar por error una versión en modo local o sin mapa.
3. Compila y sube.

La primera vez que se publiquen las reglas de Storage en un proyecto nuevo, hazlo desde una terminal interactiva: la CLI pide permiso para que Storage pueda leer `config/acceso` en Firestore. Acéptalo.

**Seguridad de lo publicado:** `firebase.json` define las cabeceras HTTP (CSP, anti-iframe, nosniff…). Si agregan un servicio externo nuevo (otra API, fuentes, imágenes de otro dominio), hay que permitirlo en la `Content-Security-Policy`, o el navegador lo bloqueará. La API key de Google Maps va dentro de la web por diseño: protégela en Google Cloud restringiéndola a los dominios publicados y **solo** a las tres APIs que usa la app: *Maps JavaScript API* (el mapa), *Places API (New)* (buscar lugares y negocios) y *Geocoding API* (la dirección de un punto tocado en el mapa). Si Places no está permitida, la búsqueda cae sola a OpenStreetMap.

**Volver atrás:** en la consola de Firebase, *Hosting → Historial de versiones → Revertir* restaura la versión anterior de la web al instante.

## Colaborar (para la otra persona)

Para editar el código y probarlo en su computador:

1. **GitHub**: el dueño la invita al repo en *Settings → Collaborators → Add people*. Ella acepta la invitación desde su correo.
2. **Herramientas**: [Node.js](https://nodejs.org) 20 o más nuevo, y git.
3. **Copia local**:
   ```bash
   git clone https://github.com/JuanMiguelD/viajes-y-planes.git
   cd viajes-y-planes
   npm install
   ```
4. **Configuración**: crea `.env.local` con los mismos valores que tiene el dueño. Pásenselos por un canal privado (WhatsApp, en persona), **nunca** subiéndolos al repo. Sin ese archivo la app arranca en modo local, que también sirve para probar diseño.
5. **Probar**: `npm run dev` y abrir `http://localhost:5173`. Para entrar con Google, su correo debe estar en `config/acceso`.
6. **Desplegar reglas o la web** (opcional): el dueño la agrega al proyecto de Firebase en *Configuración del proyecto → Usuarios y permisos* con rol **Editor**. Después ella ejecuta `npx firebase login` y publica con `npm run deploy` desde `main` actualizado (`git pull`), nunca desde una copia vieja: publicar reemplaza la web, las cabeceras y las reglas por las de su carpeta.

Cada uno trabaja en una rama (`git switch -c mi-cambio`) y abre un *pull request* para que el otro lo revise antes de unirlo a `main`.

## Juegos (sección escondida)

Toca tres veces seguidas el corazón junto a "Nuestros planes" en la cabecera. Desde ahí, en la computadora queda "Juegos" en el menú lateral; en el celular se entra de nuevo por el corazón.

**Palabritas** es el Wordle para dos que hicimos aparte, adaptado a la app. La mesa vive en Firestore (`games/palabritas`) y la palabra secreta en `games/palabritas/private/secret`, que **solo puede leer quien la eligió** (lo hacen cumplir las reglas). Por eso es el dispositivo de quien puso la palabra el que revela los colores de cada intento: tiene que tener el juego abierto para que se vean.

Para probarlo en local con dos cuentas de prueba, sin tocar el proyecto real, la app tiene un modo con los emuladores de Firebase (`VITE_FIREBASE_EMULATORS=true`); la revisión previa al despliegue impide publicarlo.

