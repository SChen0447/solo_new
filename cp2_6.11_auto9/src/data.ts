export interface Photo {
  id: number;
  url: string;
  title: string;
  description: string;
  height: number;
}

const photos: Photo[] = [
  { id: 1, url: 'https://picsum.photos/seed/polaroid1/400/500', title: 'Mountain Dawn', description: 'First light breaking over alpine peaks', height: 500 },
  { id: 2, url: 'https://picsum.photos/seed/polaroid2/400/300', title: 'Coastal Breeze', description: 'Waves crashing against weathered rocks', height: 300 },
  { id: 3, url: 'https://picsum.photos/seed/polaroid3/400/600', title: 'Urban Nightscape', description: 'City lights reflecting off rain-soaked streets', height: 600 },
  { id: 4, url: 'https://picsum.photos/seed/polaroid4/400/350', title: 'Autumn Path', description: 'Golden leaves carpeting a forest trail', height: 350 },
  { id: 5, url: 'https://picsum.photos/seed/polaroid5/400/450', title: 'Desert Bloom', description: 'Rare wildflowers in arid landscape', height: 450 },
  { id: 6, url: 'https://picsum.photos/seed/polaroid6/400/320', title: 'Harbor Fog', description: 'Fishing boats shrouded in morning mist', height: 320 },
  { id: 7, url: 'https://picsum.photos/seed/polaroid7/400/550', title: 'Starlit Valley', description: 'Milky way arching over a quiet valley', height: 550 },
  { id: 8, url: 'https://picsum.photos/seed/polaroid8/400/280', title: 'Vintage Market', description: 'Colorful stalls at a weekend flea market', height: 280 },
  { id: 9, url: 'https://picsum.photos/seed/polaroid9/400/480', title: 'Snow Bridge', description: 'Historic stone bridge in winter silence', height: 480 },
  { id: 10, url: 'https://picsum.photos/seed/polaroid10/400/360', title: 'Tulip Fields', description: 'Rows of vibrant tulips stretching to horizon', height: 360 },
  { id: 11, url: 'https://picsum.photos/seed/polaroid11/400/520', title: 'Lighthouse Glow', description: 'Beacon cutting through coastal twilight', height: 520 },
  { id: 12, url: 'https://picsum.photos/seed/polaroid12/400/300', title: 'Rooftop View', description: 'Panoramic skyline at golden hour', height: 300 },
  { id: 13, url: 'https://picsum.photos/seed/polaroid13/400/440', title: 'Bamboo Grove', description: 'Tall bamboo swaying in gentle wind', height: 440 },
  { id: 14, url: 'https://picsum.photos/seed/polaroid14/400/380', title: 'Lakeside Cabin', description: 'A quiet retreat mirrored in still water', height: 380 },
  { id: 15, url: 'https://picsum.photos/seed/polaroid15/400/560', title: 'Canyon Shadows', description: 'Deep erosion patterns in sandstone walls', height: 560 },
  { id: 16, url: 'https://picsum.photos/seed/polaroid16/400/310', title: 'Café Corner', description: 'Espresso and pastry in a Parisian window', height: 310 },
  { id: 17, url: 'https://picsum.photos/seed/polaroid17/400/470', title: 'Northern Lights', description: 'Aurora borealis dancing across the sky', height: 470 },
  { id: 18, url: 'https://picsum.photos/seed/polaroid18/400/340', title: 'Garden Gate', description: 'Wrought iron entrance to a secret garden', height: 340 },
  { id: 19, url: 'https://picsum.photos/seed/polaroid19/400/530', title: 'Volcanic Shore', description: 'Black sand meeting turquoise waters', height: 530 },
  { id: 20, url: 'https://picsum.photos/seed/polaroid20/400/290', title: 'Train Platform', description: 'Vintage locomotive awaiting departure', height: 290 },
];

export default photos;
