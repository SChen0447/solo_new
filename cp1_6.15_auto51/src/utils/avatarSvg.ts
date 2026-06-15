import { AvatarComponents } from '../store/avatarStore';

export function renderAvatarSVG(components: AvatarComponents, size: number = 256): string {
  const c = components;
  const headColor = c.headColor || '#fdbcb4';
  const eyeColor = c.eyeColor || '#2c3e50';
  const browColor = c.browColor || '#5d4037';
  const noseColor = c.noseColor || '#e8a88a';
  const mouthColor = c.mouthColor || '#e74c3c';
  const hairColor = c.hairColor || '#3e2723';
  const topColor = c.topColor || '#4a90d9';
  const bottomColor = c.bottomColor || '#2c3e50';
  const accColor = c.accColor || '#f1c40f';

  const headShapes = [
    `<ellipse cx="128" cy="110" rx="72" ry="82" fill="${headColor}"/>`,
    `<rect x="56" y="28" width="144" height="164" rx="72" fill="${headColor}"/>`,
    `<ellipse cx="128" cy="108" rx="78" ry="76" fill="${headColor}"/>`,
    `<path d="M128 24 C68 24 40 80 40 120 C40 168 76 192 128 192 C180 192 216 168 216 120 C216 80 188 24 128 24Z" fill="${headColor}"/>`,
    `<path d="M128 20 C60 20 48 76 48 116 C48 160 80 196 128 196 C176 196 208 160 208 116 C208 76 196 20 128 20Z" fill="${headColor}"/>`,
  ];

  const ears = `<ellipse cx="52" cy="108" rx="12" ry="18" fill="${headColor}"/><ellipse cx="204" cy="108" rx="12" ry="18" fill="${headColor}"/>`;

  const eyes = [
    `<ellipse cx="100" cy="102" rx="14" ry="16" fill="white"/><ellipse cx="156" cy="102" rx="14" ry="16" fill="white"/><circle cx="102" cy="104" r="8" fill="${eyeColor}"/><circle cx="158" cy="104" r="8" fill="${eyeColor}"/><circle cx="104" cy="100" r="3" fill="white"/><circle cx="160" cy="100" r="3" fill="white"/>`,
    `<path d="M86 98 Q100 88 114 98" stroke="${eyeColor}" stroke-width="4" fill="none"/><path d="M142 98 Q156 88 170 98" stroke="${eyeColor}" stroke-width="4" fill="none"/>`,
    `<ellipse cx="100" cy="102" rx="18" ry="12" fill="white"/><ellipse cx="156" cy="102" rx="18" ry="12" fill="white"/><circle cx="100" cy="102" r="7" fill="${eyeColor}"/><circle cx="156" cy="102" r="7" fill="${eyeColor}"/>`,
    `<path d="M86 94 L114 94 L114 108 Q100 118 86 108 Z" fill="white"/><path d="M142 94 L170 94 L170 108 Q156 118 142 108 Z" fill="white"/><circle cx="100" cy="102" r="6" fill="${eyeColor}"/><circle cx="156" cy="102" r="6" fill="${eyeColor}"/>`,
    `<line x1="86" y1="100" x2="114" y2="100" stroke="${eyeColor}" stroke-width="5" stroke-linecap="round"/><line x1="142" y1="100" x2="170" y2="100" stroke="${eyeColor}" stroke-width="5" stroke-linecap="round"/>`,
  ];

  const brows = [
    `<path d="M86 86 Q100 78 114 84" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M142 84 Q156 78 170 86" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<path d="M86 84 L114 84" stroke="${browColor}" stroke-width="4" stroke-linecap="round"/><path d="M142 84 L170 84" stroke="${browColor}" stroke-width="4" stroke-linecap="round"/>`,
    `<path d="M86 88 Q100 76 114 82" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M142 82 Q156 76 170 88" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<path d="M86 82 Q100 90 114 86" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M142 86 Q156 90 170 82" stroke="${browColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<path d="M86 86 Q100 74 114 80" stroke="${browColor}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M142 80 Q156 74 170 86" stroke="${browColor}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  ];

  const noses = [
    `<path d="M124 112 Q128 124 132 112" stroke="${noseColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    `<circle cx="128" cy="118" r="4" fill="${noseColor}"/>`,
    `<path d="M122 116 Q128 126 134 116" stroke="${noseColor}" stroke-width="2" fill="none"/>`,
    `<line x1="128" y1="108" x2="128" y2="120" stroke="${noseColor}" stroke-width="2.5" stroke-linecap="round"/><circle cx="124" cy="122" r="2" fill="${noseColor}"/><circle cx="132" cy="122" r="2" fill="${noseColor}"/>`,
    `<path d="M124 114 Q128 126 132 114" stroke="${noseColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ];

  const mouths = [
    `<path d="M108 138 Q128 156 148 138" stroke="${mouthColor}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
    `<path d="M108 136 Q128 150 148 136" fill="${mouthColor}"/><path d="M108 136 Q128 142 148 136" fill="#c0392b"/>`,
    `<ellipse cx="128" cy="140" rx="12" ry="8" fill="${mouthColor}"/>`,
    `<path d="M108 140 L148 140" stroke="${mouthColor}" stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M108 140 Q118 150 128 140 Q138 130 148 140" stroke="${mouthColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ];

  const hairs = [
    `<path d="M56 80 Q56 20 128 20 Q200 20 200 80 L200 70 Q200 28 128 28 Q56 28 56 70 Z" fill="${hairColor}"/><path d="M48 86 Q48 16 128 16 Q208 16 208 86 L208 76 Q208 20 128 20 Q48 20 48 76 Z" fill="${hairColor}"/>`,
    `<path d="M52 90 Q52 22 128 22 Q204 22 204 90" fill="${hairColor}"/><path d="M52 90 Q80 70 100 90 Q120 70 140 90 Q160 70 180 90 Q204 70 204 90" fill="${hairColor}"/>`,
    `<path d="M56 78 Q56 18 128 18 Q200 18 200 78" fill="${hairColor}"/><rect x="192" y="40" width="24" height="100" rx="12" fill="${hairColor}"/>`,
    `<path d="M56 82 Q56 24 128 24 Q200 24 200 82" fill="${hairColor}"/><path d="M52 82 C60 82 64 60 80 55 C70 72 76 82 92 80 C82 68 86 50 104 46 C96 64 100 78 116 76 C108 60 110 42 128 38 C146 42 148 60 140 76 C156 78 160 64 152 46 C170 50 174 68 164 80 C180 82 186 72 176 55 C192 60 196 82 204 82 Q204 24 128 24 Q56 24 52 82Z" fill="${hairColor}"/>`,
    `<path d="M56 80 Q56 16 128 16 Q200 16 200 80" fill="${hairColor}"/><rect x="44" y="40" width="24" height="120" rx="12" fill="${hairColor}"/><rect x="188" y="40" width="24" height="120" rx="12" fill="${hairColor}"/>`,
  ];

  const tops = [
    `<path d="M60 196 Q60 180 88 172 Q108 166 128 166 Q148 166 168 172 Q196 180 196 196 L196 256 L60 256 Z" fill="${topColor}"/>`,
    `<path d="M60 196 Q60 180 88 172 Q108 166 128 166 Q148 166 168 172 Q196 180 196 196 L196 256 L60 256 Z" fill="${topColor}"/><line x1="128" y1="166" x2="128" y2="256" stroke="rgba(0,0,0,0.15)" stroke-width="2"/><circle cx="128" cy="186" r="4" fill="#f1c40f"/>`,
    `<path d="M60 196 Q60 180 88 172 Q108 166 128 166 Q148 166 168 172 Q196 180 196 196 L196 256 L60 256 Z" fill="${topColor}"/><path d="M88 172 L68 210 L96 210 Z" fill="${topColor}" opacity="0.8"/><path d="M168 172 L188 210 L160 210 Z" fill="${topColor}" opacity="0.8"/>`,
    `<path d="M60 196 Q60 180 88 172 Q108 166 128 166 Q148 166 168 172 Q196 180 196 196 L196 256 L60 256 Z" fill="${topColor}"/><path d="M80 196 Q128 176 176 196" stroke="rgba(255,255,255,0.3)" stroke-width="3" fill="none"/>`,
    `<path d="M56 196 Q56 178 86 170 Q108 164 128 164 Q148 164 170 170 Q200 178 200 196 L200 256 L56 256 Z" fill="${topColor}"/><rect x="112" y="168" width="32" height="8" rx="4" fill="rgba(255,255,255,0.2)"/>`,
  ];

  const bottoms = [
    `<rect x="60" y="244" width="56" height="12" rx="4" fill="${bottomColor}"/><rect x="140" y="244" width="56" height="12" rx="4" fill="${bottomColor}"/>`,
    `<rect x="68" y="242" width="120" height="14" rx="4" fill="${bottomColor}"/>`,
    `<path d="M68 240 L68 256 L120 256 L120 240 Z" fill="${bottomColor}"/><path d="M136 240 L136 256 L188 256 L188 240 Z" fill="${bottomColor}"/>`,
    `<rect x="64" y="242" width="128" height="14" rx="4" fill="${bottomColor}"/><line x1="128" y1="242" x2="128" y2="256" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>`,
    `<rect x="66" y="241" width="124" height="15" rx="5" fill="${bottomColor}"/><circle cx="128" cy="248" r="3" fill="rgba(255,255,255,0.3)"/>`,
  ];

  const accessories = [
    ``,
    `<circle cx="100" cy="102" r="20" fill="none" stroke="${accColor}" stroke-width="3"/><circle cx="156" cy="102" r="20" fill="none" stroke="${accColor}" stroke-width="3"/><line x1="120" y1="100" x2="136" y2="100" stroke="${accColor}" stroke-width="3"/>`,
    `<path d="M80 74 Q128 56 176 74" fill="none" stroke="${accColor}" stroke-width="4" stroke-linecap="round"/><circle cx="80" cy="74" r="5" fill="${accColor}"/><circle cx="176" cy="74" r="5" fill="${accColor}"/>`,
    `<circle cx="128" cy="132" r="8" fill="${accColor}"/><line x1="128" y1="124" x2="128" y2="118" stroke="${accColor}" stroke-width="2"/>`,
    `<path d="M60 90 Q40 100 44 120" stroke="${accColor}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M196 90 Q216 100 212 120" stroke="${accColor}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}">`;
  svg += headShapes[c.headShape || 0];
  svg += ears;
  svg += eyes[c.eyes || 0];
  svg += brows[c.brows || 0];
  svg += noses[c.nose || 0];
  svg += mouths[c.mouth || 0];
  svg += hairs[c.hair || 0];
  svg += tops[c.top || 0];
  svg += bottoms[c.bottom || 0];
  svg += accessories[c.accessory || 0];
  svg += `</svg>`;

  return svg;
}

export function hsbToHex(h: number, s: number, b: number): string {
  s /= 100;
  b /= 100;
  const k = (n: number) => (n + h / 60) % 6;
  const f = (n: number) => b * (1 - s * Math.max(0, Math.min(k(n), 4 - k(n), 1)));
  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
}

export function hexToHsb(hex: string): { h: number; s: number; b: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const brightness = max * 100;
  return { h, s, b: brightness };
}
