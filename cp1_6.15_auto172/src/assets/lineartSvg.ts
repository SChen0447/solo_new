export const CHARACTER_SVG: string = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <defs>
    <filter id="outline-stroke">
      <feMorphology operator="dilate" radius="1" in="SourceAlpha" result="thicken"/>
      <feFlood flood-color="#212121" flood-opacity="1" result="color"/>
      <feComposite in="color" in2="thicken" operator="in" result="outlined"/>
      <feMerge>
        <feMergeNode in="outlined"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <g id="layer-background" class="svg-layer" data-layer="background">
    <rect x="0" y="0" width="400" height="500" rx="8" fill="#F8F9FA"/>
  </g>

  <g id="layer-shoes" class="svg-layer" data-layer="shoes">
    <path d="M 140 450 Q 130 445 130 455 L 130 470 L 185 470 L 195 470 Q 205 470 205 460 L 205 455 Q 205 448 195 450 Z" fill="#495057"/>
    <path d="M 200 450 Q 195 445 195 455 L 195 470 L 270 470 L 270 455 Q 270 448 260 450 Z" fill="#495057"/>
    <path d="M 130 455 L 130 470 L 185 470 L 195 470 Q 205 470 205 460 L 205 455 Q 205 448 195 450 L 140 450 Q 130 445 130 455 Z" fill="none" stroke="#212121" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M 195 455 L 195 470 L 270 470 L 270 455 Q 270 448 260 450 L 200 450 Q 195 445 195 455 Z" fill="none" stroke="#212121" stroke-width="1.5" stroke-linejoin="round"/>
  </g>

  <g id="layer-pants" class="svg-layer" data-layer="pants">
    <path d="M 145 330 Q 140 340 142 360 L 138 445 Q 138 452 148 452 L 188 452 Q 195 452 197 446 L 200 365 L 203 446 Q 205 452 212 452 L 262 452 Q 272 452 272 445 L 258 360 Q 260 340 255 330 Z" fill="#343A40"/>
    <path d="M 145 330 L 255 330 Q 260 340 258 360 L 272 445 Q 272 452 262 452 L 212 452 Q 205 452 203 446 L 200 365 L 197 446 Q 195 452 188 452 L 148 452 Q 138 452 138 445 L 142 360 Q 140 340 145 330 Z" fill="none" stroke="#212121" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="200" y1="340" x2="200" y2="420" stroke="#212121" stroke-width="1.2" stroke-linecap="round"/>
  </g>

  <g id="layer-shirt" class="svg-layer" data-layer="shirt">
    <path d="M 130 200 Q 120 205 118 215 L 100 290 Q 100 300 108 302 L 142 302 L 145 330 L 255 330 L 258 302 L 292 302 Q 300 300 300 290 L 282 215 Q 280 205 270 200 L 235 185 L 220 175 Q 210 170 200 170 Q 190 170 180 175 L 165 185 Z" fill="#1976D2"/>
    <path d="M 130 200 Q 120 205 118 215 L 100 290 Q 100 300 108 302 L 142 302 L 145 330 L 255 330 L 258 302 L 292 302 Q 300 300 300 290 L 282 215 Q 280 205 270 200 L 235 185 L 220 175 Q 210 170 200 170 Q 190 170 180 175 L 165 185 Z" fill="none" stroke="#212121" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M 180 175 L 200 200 L 220 175" fill="none" stroke="#212121" stroke-width="1.2" stroke-linejoin="round"/>
    <circle cx="200" cy="240" r="2.5" fill="#212121"/>
    <circle cx="200" cy="270" r="2.5" fill="#212121"/>
    <path d="M 118 215 Q 105 220 108 235 L 100 290" fill="none" stroke="#212121" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M 282 215 Q 295 220 292 235 L 300 290" fill="none" stroke="#212121" stroke-width="1.5" stroke-linejoin="round"/>
  </g>

  <g id="layer-skin" class="svg-layer" data-layer="skin">
    <ellipse cx="200" cy="115" rx="55" ry="60" fill="#FFE0C2"/>
    <ellipse cx="200" cy="115" rx="55" ry="60" fill="none" stroke="#212121" stroke-width="1.5"/>
    <path d="M 170 170 Q 180 172 190 170 L 200 180 L 210 170 Q 220 172 230 170 L 235 185 L 165 185 Z" fill="#FFE0C2"/>
    <path d="M 165 185 L 200 170 L 235 185" fill="none" stroke="#212121" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 145 195 Q 138 200 135 215 Q 130 210 130 200 L 145 195 Z" fill="#FFE0C2"/>
    <path d="M 255 195 Q 262 200 265 215 Q 270 210 270 200 L 255 195 Z" fill="#FFE0C2"/>
    <path d="M 145 195 Q 138 200 135 215 Q 130 210 130 200 L 145 195 Z" fill="none" stroke="#212121" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 255 195 Q 262 200 265 215 Q 270 210 270 200 L 255 195 Z" fill="none" stroke="#212121" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 100 290 Q 105 298 108 302 L 142 302 L 140 325 Q 130 318 128 305 L 100 290 Z" fill="#FFE0C2"/>
    <path d="M 100 290 Q 105 298 108 302 L 142 302 L 140 325 Q 130 318 128 305 L 100 290 Z" fill="none" stroke="#212121" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 300 290 Q 295 298 292 302 L 258 302 L 260 325 Q 270 318 272 305 L 300 290 Z" fill="#FFE0C2"/>
    <path d="M 300 290 Q 295 298 292 302 L 258 302 L 260 325 Q 270 318 272 305 L 300 290 Z" fill="none" stroke="#212121" stroke-width="1.2" stroke-linejoin="round"/>
    <ellipse cx="180" cy="115" rx="5" ry="7" fill="#212121"/>
    <ellipse cx="220" cy="115" rx="5" ry="7" fill="#212121"/>
    <circle cx="182" cy="113" r="1.5" fill="#fff"/>
    <circle cx="222" cy="113" r="1.5" fill="#fff"/>
    <path d="M 170 95 Q 180 92 190 95" fill="none" stroke="#212121" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 210 95 Q 220 92 230 95" fill="none" stroke="#212121" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 192 135 Q 200 140 208 135" fill="none" stroke="#212121" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M 193 130 Q 197 132 200 130 Q 203 132 207 130" fill="none" stroke="#212121" stroke-width="1" stroke-linecap="round"/>
    <ellipse cx="165" cy="130" rx="6" ry="4" fill="#FFB8A0" opacity="0.5"/>
    <ellipse cx="235" cy="130" rx="6" ry="4" fill="#FFB8A0" opacity="0.5"/>
  </g>

  <g id="layer-hair" class="svg-layer" data-layer="hair">
    <path d="M 150 95 Q 145 55 170 50 Q 185 40 200 42 Q 215 40 230 50 Q 255 55 250 95 Q 248 85 240 80 Q 235 65 220 62 Q 205 58 200 60 Q 195 58 180 62 Q 165 65 160 80 Q 152 85 150 95 Z" fill="#5C3A21"/>
    <path d="M 150 95 Q 145 55 170 50 Q 185 40 200 42 Q 215 40 230 50 Q 255 55 250 95 Q 248 85 240 80 Q 235 65 220 62 Q 205 58 200 60 Q 195 58 180 62 Q 165 65 160 80 Q 152 85 150 95 Z" fill="none" stroke="#212121" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M 150 90 Q 148 75 152 65 L 148 115 Q 146 120 150 125 L 155 105 Q 152 98 150 90 Z" fill="#5C3A21"/>
    <path d="M 250 90 Q 252 75 248 65 L 252 115 Q 254 120 250 125 L 245 105 Q 248 98 250 90 Z" fill="#5C3A21"/>
    <path d="M 150 90 Q 148 75 152 65 L 148 115 Q 146 120 150 125 L 155 105 Q 152 98 150 90 Z" fill="none" stroke="#212121" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 250 90 Q 252 75 248 65 L 252 115 Q 254 120 250 125 L 245 105 Q 248 98 250 90 Z" fill="none" stroke="#212121" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M 170 75 Q 175 70 180 72" fill="none" stroke="#3D2514" stroke-width="1" stroke-linecap="round"/>
    <path d="M 200 68 Q 203 65 208 67" fill="none" stroke="#3D2514" stroke-width="1" stroke-linecap="round"/>
    <path d="M 225 75 Q 230 70 235 72" fill="none" stroke="#3D2514" stroke-width="1" stroke-linecap="round"/>
  </g>
</svg>
`;

export const LAYER_WARNING_POSITIONS: Record<string, { x: number; y: number }> = {
  background: { x: 370, y: 30 },
  skin: { x: 265, y: 75 },
  hair: { x: 140, y: 55 },
  shirt: { x: 305, y: 250 },
  pants: { x: 280, y: 400 },
  shoes: { x: 310, y: 455 }
};
