"""Genera los íconos de la app (pareja de pingüinos) en SVG: python3 scripts/make-icons.py

Después hay que volver a exportar los PNG desde los SVG, con cualquier conversor SVG→PNG:
  icon.svg          → icon-192.png (192 px) e icon-512.png (512 px), con fondo transparente en las esquinas
  icon-maskable.svg → icon-maskable-512.png (512 px) y apple-touch-icon.png (180 px), sin transparencia
y copiar icon.svg a public/favicon.svg.
"""
from pathlib import Path

INK = '#3a3346'      # plumaje
EYE = '#2a2433'
CREAM = '#fffdf8'    # pancita
BEAK = '#f2a33a'
CHEEK = '#f7a8b0'
HEART = '#d6304a'
HEART_SOFT = '#f08a9a'
BG = '#f6e7d2'
BG_GLOW = '#fbf1e3'


def heart(x, y, s, fill):
    return (f'<path transform="translate({x} {y}) scale({s})" fill="{fill}" '
            'd="M0 18C-30-4-34-26-18-34-8-39 0-32 0-24 0-32 8-39 18-34 34-26 30-4 0 18Z"/>')


def penguin(x, y, angle, scale, girl):
    inner = 1 if not girl else -1  # hacia dónde está la pareja
    parts = [
        # patitas
        f'<ellipse cx="-30" cy="97" rx="25" ry="11" fill="{BEAK}"/>',
        f'<ellipse cx="30" cy="97" rx="25" ry="11" fill="{BEAK}"/>',
        # ala de afuera
        f'<ellipse cx="{-82 * inner}" cy="24" rx="20" ry="46" transform="rotate({18 * inner} {-82 * inner} 24)" fill="{INK}"/>',
        # cuerpo
        f'<ellipse cx="0" cy="0" rx="84" ry="100" fill="{INK}"/>',
        # carita + pancita
        f'<ellipse cx="0" cy="18" rx="64" ry="78" fill="{CREAM}"/>',
        f'<circle cx="-25" cy="-28" r="31" fill="{CREAM}"/>',
        f'<circle cx="25" cy="-28" r="31" fill="{CREAM}"/>',
        # cachetes
        f'<ellipse cx="-41" cy="-2" rx="12" ry="7.5" fill="{CHEEK}"/>',
        f'<ellipse cx="41" cy="-2" rx="12" ry="7.5" fill="{CHEEK}"/>',
    ]
    if girl:  # ojitos cerrados de felicidad
        parts += [
            f'<path d="M-36-24q11-12 22 0M14-24q11-12 22 0" fill="none" stroke="{EYE}" stroke-width="5.5" stroke-linecap="round"/>',
        ]
    else:
        parts += [
            f'<circle cx="-24" cy="-25" r="10" fill="{EYE}"/><circle cx="24" cy="-25" r="10" fill="{EYE}"/>',
            '<circle cx="-20.5" cy="-28.5" r="3.6" fill="#fff"/><circle cx="27.5" cy="-28.5" r="3.6" fill="#fff"/>',
        ]
    # piquito
    parts.append(f'<path d="M-14-12Q0-21 14-12Q5 4 0 6-5 4-14-12Z" fill="{BEAK}"/>')
    if girl:  # moñito
        parts.append(
            f'<g transform="translate(42 -84) rotate(22)">'
            f'<path d="M0 0C-24-24-46-4-37 13-30 25-12 14 0 0Z" fill="{HEART}"/>'
            f'<path d="M0 0C24-24 46-4 37 13 30 25 12 14 0 0Z" fill="{HEART}"/>'
            f'<path d="M-30 4C-30-6-20-10-14-6" fill="none" stroke="#ef6a7c" stroke-width="4" stroke-linecap="round"/>'
            f'<circle r="10" fill="#b8243b"/></g>')
    else:  # copete
        parts.append(f'<path d="M-6-97q-6-24 10-28-8 11 2 22 2-17 18-15-13 8-9 21z" fill="{INK}"/>')
    # ala de adentro: se dan la mano
    parts.append(
        f'<ellipse cx="{86 * inner}" cy="58" rx="17" ry="40" transform="rotate({-72 * inner} {86 * inner} 58)" fill="{INK}"/>')
    return f'<g transform="translate({x} {y}) rotate({angle}) scale({scale})">{"".join(parts)}</g>'


def scene():
    return ''.join([
        '<ellipse cx="256" cy="414" rx="158" ry="15" fill="#3a2a1c" opacity=".08"/>',
        penguin(326, 304, 6, 0.94, girl=True),
        penguin(190, 300, -5, 1, girl=False),
        heart(256, 136, 1.65, HEART),
        '<ellipse cx="243" cy="112" rx="9" ry="6" transform="rotate(-30 243 112)" fill="#fff" opacity=".35"/>',
        heart(150, 140, 0.55, HEART_SOFT),
        heart(368, 118, 0.45, HEART_SOFT),
    ])


def svg(body, size=512):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 512 512">{body}</svg>\n'


variants = {
    # Ícono normal: esquinas redondeadas, fondo crema
    'icon.svg': svg(f'<rect width="512" height="512" rx="116" fill="{BG}"/><circle cx="256" cy="262" r="196" fill="{BG_GLOW}"/>{scene()}'),
    # Maskable: fondo a sangre y dibujo dentro de la zona segura (Android recorta la forma)
    'icon-maskable.svg': svg(f'<rect width="512" height="512" fill="{BG}"/><circle cx="256" cy="262" r="210" fill="{BG_GLOW}"/>'
                             f'<g transform="translate(256 262) scale(.8) translate(-256 -262)">{scene()}</g>'),
}
out = Path(__file__).resolve().parent.parent / 'public' / 'icons'
out.mkdir(parents=True, exist_ok=True)
for name, content in variants.items():
    (out / name).write_text(content)
    print('escrito', out / name)
