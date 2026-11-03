# Dirección visual

**Idea:** nuestro álbum compartido. Un espacio tierno y cálido para dos: anotamos lo que soñamos hacer, lo tachamos juntos y pegamos las fotos como en un álbum de verdad. Lindo sin ser infantil: la ternura viene del tono, las formas suaves y las fotos, no de adornos.

## Voz

Primera persona del plural y español latino neutro: "Nos quedan 5 planes", "¡Lo hicimos!", "Subir fotos", "Agregar". Nada de vosotros. Frases cortas y cálidas, sin cursilería.

## Color

| Token           | Hex       | Uso |
|-----------------|-----------|-----|
| `--paper`       | `#F1E4D0` | Fondo de navegación, huecos de foto. Beige cálido. |
| `--surface`     | `#FDF8F0` | Fondo de contenido y paneles. Crema. |
| `--line`        | `#E6D7BB` | Separadores. |
| `--ink`         | `#3B2B1C` | Texto: marrón café oscuro, más suave que el negro. |
| `--muted`       | `#8C7355` | Texto secundario. |
| `--coffee`      | `#8A5A34` | **Principal.** Cumplido, acciones, marcadores, navegación activa. Marrón café. |
| `--coffee-tint` | `#EAD9BF` | Estados seleccionados. |
| `--honey`       | `#A8761A` | **Acento.** Solo fechas límite cercanas o vencidas. |
| `--heart`       | `#D6304A` | Solo los corazones (marca, categoría "Los dos", favoritos). Rojo, el único toque de color fuera de la paleta café. |

El mapa también se tiñe: tierra beige, parques verde salvia y agua azul suave.

## Tipografía

- **Nunito**: toda la interfaz. Sus terminaciones redondeadas dan el tono. Los títulos van en 800 con el tracking cerrado.
- **Caveat** (letra manuscrita): solo para lo personal, es decir, el nombre de la app, los pies de foto del álbum y el título de cada página del álbum. Nunca en botones ni en datos.

## Codificación

- **Estado** = relleno. Cumplido: círculo café relleno. Pendiente: círculo con borde. Igual en la lista y en el mapa.
- **Categoría** = icono: corazón rojo para "Los dos", personas para "Con amigos".
- **Etiqueta** = icono del tipo de lugar (restaurante, café, parque…), independiente de la categoría.
- **Favorito** = corazón rojo relleno, independiente de "para repetir".
- **Fecha límite** = texto en miel si vence en 7 días o menos, o si ya venció.

## Composición

- **Planes**: una frase en primera persona y una lista con separadores ("Con fecha", "Sin fecha", "Cumplidos").
- **Mapa**: a pantalla completa, con los marcadores agrupados y un panel con la foto del plan.
- **Para repetir**: la foto de la última vez y cuánto hace de ella.
- **Álbum** (lo más llamativo): un libro que se hojea. Tapa de tela café con costura dorada, el título (editable y compartido) escrito a mano y una foto pegada; dedicatoria; una página por recuerdo con la foto montada con esquineros, título a mano, fecha, lugar y nota; "Continuará…" y contratapa. Las hojas giran en 3D sobre el lomo (doble página en pantallas grandes, una en el celular). "Por fecha" y "Por lugar" siguen mostrando las polaroids. Cada plan tiene su página, con sus fotos en mosaico. Se pueden subir fotos desde el álbum eligiendo el plan.

Formas: botones en píldora, campos y paneles con 12–20px de radio, y fotos con marco blanco. El movimiento solo responde a acciones del usuario, y se respeta `prefers-reduced-motion`.

## Logo

Una pareja de pingüinos tomados de la mano bajo un corazón rojo: él con copete y ojitos abiertos, ella con moñito rojo y ojitos cerrados de felicidad. Fondo crema. Es un dibujo original en SVG (`scripts/make-icons.py`) en dos versiones: `icon.svg` (esquinas redondeadas; pestaña del navegador y Android) e `icon-maskable.svg` (fondo completo; Android recorta la forma y el iPhone redondea solo). Solo se usa como ícono de la app: dentro de la app, la cabecera lleva la ilustración `us.png`.

