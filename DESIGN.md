# Dirección visual

**Idea:** nuestro álbum compartido. Un espacio tierno y cálido para dos: anotamos lo que soñamos hacer, lo tachamos juntos y pegamos las fotos como en un álbum de verdad. Lindo sin ser infantil: la ternura viene del tono, las formas suaves y las fotos, no de adornos.

## Voz

Primera persona del plural y español latino neutro: "Nos quedan 5 planes", "¡Lo hicimos!", "Subir fotos", "Agregar". Nada de vosotros. Frases cortas y cálidas, sin cursilería.

## Color

| Token          | Hex       | Uso |
|----------------|-----------|-----|
| `--paper`      | `#FBEFF0` | Fondo de navegación, huecos de foto. Blanco rosado. |
| `--surface`    | `#FFFAF9` | Fondo de contenido y paneles. |
| `--line`       | `#F0DDE0` | Separadores. |
| `--ink`        | `#3A2A30` | Texto: marrón ciruela, más suave que el negro. |
| `--muted`      | `#8E7A81` | Texto secundario. |
| `--rose`       | `#C8476B` | **Principal.** Cumplido, acciones, marcadores, navegación activa. |
| `--rose-tint`  | `#FCE4EA` | Estados seleccionados. |
| `--honey`      | `#B07A10` | **Acento.** Solo fechas límite cercanas o vencidas. |

El mapa también se tiñe: tierra rosada, parques verde salvia y agua azul bebé.

## Tipografía

- **Nunito**: toda la interfaz. Sus terminaciones redondeadas dan el tono. Los títulos van en 800 con el tracking cerrado.
- **Caveat** (letra manuscrita): solo para lo personal, es decir, el nombre de la app, los pies de foto del álbum y el título de cada página del álbum. Nunca en botones ni en datos.

## Codificación

- **Estado** = relleno. Cumplido: círculo rosa relleno. Pendiente: círculo con borde. Igual en la lista y en el mapa.
- **Categoría** = icono: corazón para "Los dos", personas para "Con amigos".
- **Fecha límite** = texto en miel si vence en 7 días o menos, o si ya venció.

## Composición

- **Planes**: una frase en primera persona y una lista con separadores ("Con fecha", "Sin fecha", "Cumplidos").
- **Mapa**: a pantalla completa, con los marcadores agrupados y un panel con la foto del plan.
- **Para repetir**: la foto de la última vez y cuánto hace de ella.
- **Álbum** (lo más llamativo): fotos tipo polaroid con una ligera inclinación, el pie de foto escrito a mano y una pila de tarjetas cuando hay varias fotos. Cada plan tiene su página, con sus fotos en mosaico. Se pueden subir fotos desde el álbum eligiendo el plan.

Formas: botones en píldora, campos y paneles con 12–20px de radio, y fotos con marco blanco. El movimiento solo responde a acciones del usuario, y se respeta `prefers-reduced-motion`.
