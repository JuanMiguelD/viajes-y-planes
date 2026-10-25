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
4. Pon vuestros dos emails en `firestore.rules` y `storage.rules`, y despliega las reglas:
   ```bash
   npx firebase-tools login
   npx firebase-tools use --add          # elige tu proyecto
   npx firebase-tools deploy --only firestore:rules,storage
   ```
5. (Opcional) Publicar la app en Firebase Hosting:
   ```bash
   npm run build && npx firebase-tools deploy --only hosting
   ```
   Añade el dominio de Hosting en Authentication → Settings → Authorized domains si no aparece ya.
