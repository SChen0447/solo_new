export interface StarData {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  glowColor: string;
}

export interface PlanetData {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  gravityRadius: number;
}

export interface CrystalData {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  collected: boolean;
  pulsePhase: number;
}

export interface StarMapData {
  stars: StarData[];
  planets: PlanetData[];
  crystals: CrystalData[];
}

export class StarGenerator {
  private viewportWidth: number;
  private viewportHeight: number;

  constructor(width: number = 640, height: number = 480) {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public generate(): StarMapData {
    const stars = this.generateStars();
    const planets = this.generatePlanets();
    const crystals = this.generateCrystals(planets);

    return { stars, planets, crystals };
  }

  private generateStars(): StarData[] {
    const count = this.randomInt(5, 8);
    const stars: StarData[] = [];
    const colors = ['#ffe066', '#ffcc00', '#ffeb3b', '#fff176'];

    for (let i = 0; i < count; i++) {
      const radius = this.randomFloat(15, 35);
      stars.push({
        id: `star_${i}`,
        x: this.randomFloat(radius + 20, this.viewportWidth - radius - 20),
        y: this.randomFloat(radius + 20, this.viewportHeight - radius - 20),
        radius,
        color: colors[Math.floor(Math.random() * colors.length)],
        glowColor: 'rgba(255, 224, 102, 0.3)'
      });
    }

    return stars;
  }

  private generatePlanets(): PlanetData[] {
    const count = this.randomInt(10, 15);
    const planets: PlanetData[] = [];
    const colors = [
      '#4fc3f7', '#81c784', '#ffb74d', '#f06292',
      '#ba68c8', '#7986cb', '#4db6ac', '#e57373'
    ];

    for (let i = 0; i < count; i++) {
      const radius = this.randomFloat(8, 20);
      const gravityRadius = radius * 1.5;
      const orbitRadius = this.randomFloat(0, 120);
      const centerX = this.randomFloat(100, this.viewportWidth - 100);
      const centerY = this.randomFloat(100, this.viewportHeight - 100);
      const orbitAngle = this.randomFloat(0, Math.PI * 2);

      planets.push({
        id: `planet_${i}`,
        x: centerX + Math.cos(orbitAngle) * orbitRadius,
        y: centerY + Math.sin(orbitAngle) * orbitRadius,
        radius,
        color: colors[Math.floor(Math.random() * colors.length)],
        orbitRadius,
        orbitSpeed: this.randomFloat(0.005, 0.02) * (Math.random() > 0.5 ? 1 : -1),
        orbitAngle,
        gravityRadius
      });
    }

    return planets;
  }

  private generateCrystals(planets: PlanetData[]): CrystalData[] {
    const count = this.randomInt(20, 30);
    const crystals: CrystalData[] = [];

    for (let i = 0; i < count; i++) {
      const planet = planets[Math.floor(Math.random() * planets.length)];
      const angle = this.randomFloat(0, Math.PI * 2);
      const distFromPlanet = this.randomFloat(planet.radius + 8, planet.gravityRadius + 40);

      crystals.push({
        id: `crystal_${i}`,
        x: planet.x + Math.cos(angle) * distFromPlanet,
        y: planet.y + Math.sin(angle) * distFromPlanet,
        radius: 8,
        color: '#ffd54f',
        collected: false,
        pulsePhase: this.randomFloat(0, Math.PI * 2)
      });
    }

    return crystals;
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  public resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }
}
