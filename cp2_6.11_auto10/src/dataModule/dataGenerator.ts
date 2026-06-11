export interface WeatherDataPoint {
  city: string;
  month: number;
  temperature: number;
  humidity: number;
  precipitation: number;
}

const CITIES = [
  '北京', '上海', '广州', '深圳', '成都',
  '杭州', '武汉', '西安', '哈尔滨', '昆明'
];

const MONTHS = 12;

interface CityClimateProfile {
  baseTemp: number;
  tempAmplitude: number;
  baseHumidity: number;
  humidityVariation: number;
  basePrecipitation: number;
  precipSeasonality: number;
}

const CLIMATE_PROFILES: Record<string, CityClimateProfile> = {
  '北京': { baseTemp: 12, tempAmplitude: 28, baseHumidity: 50, humidityVariation: 20, basePrecipitation: 40, precipSeasonality: 0.7 },
  '上海': { baseTemp: 16, tempAmplitude: 24, baseHumidity: 70, humidityVariation: 15, basePrecipitation: 110, precipSeasonality: 0.5 },
  '广州': { baseTemp: 22, tempAmplitude: 15, baseHumidity: 75, humidityVariation: 10, basePrecipitation: 180, precipSeasonality: 0.6 },
  '深圳': { baseTemp: 23, tempAmplitude: 14, baseHumidity: 72, humidityVariation: 12, basePrecipitation: 190, precipSeasonality: 0.55 },
  '成都': { baseTemp: 16, tempAmplitude: 20, baseHumidity: 80, humidityVariation: 10, basePrecipitation: 90, precipSeasonality: 0.4 },
  '杭州': { baseTemp: 17, tempAmplitude: 23, baseHumidity: 68, humidityVariation: 18, basePrecipitation: 120, precipSeasonality: 0.5 },
  '武汉': { baseTemp: 17, tempAmplitude: 26, baseHumidity: 65, humidityVariation: 20, basePrecipitation: 100, precipSeasonality: 0.55 },
  '西安': { baseTemp: 14, tempAmplitude: 27, baseHumidity: 55, humidityVariation: 22, basePrecipitation: 50, precipSeasonality: 0.65 },
  '哈尔滨': { baseTemp: 4, tempAmplitude: 38, baseHumidity: 55, humidityVariation: 25, basePrecipitation: 45, precipSeasonality: 0.7 },
  '昆明': { baseTemp: 15, tempAmplitude: 10, baseHumidity: 65, humidityVariation: 10, basePrecipitation: 100, precipSeasonality: 0.5 }
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateWeatherData(): WeatherDataPoint[] {
  const data: WeatherDataPoint[] = [];
  const random = seededRandom(42);

  for (const city of CITIES) {
    const profile = CLIMATE_PROFILES[city];
    for (let month = 0; month < MONTHS; month++) {
      const monthAngle = (month / MONTHS) * Math.PI * 2 - Math.PI / 2;
      const seasonalFactor = Math.sin(monthAngle);

      const temperature = profile.baseTemp + profile.tempAmplitude * seasonalFactor * 0.5 + (random() - 0.5) * 3;
      const humidity = Math.max(20, Math.min(100,
        profile.baseHumidity + profile.humidityVariation * -seasonalFactor * 0.5 + (random() - 0.5) * 5
      ));
      const precipitation = Math.max(0,
        profile.basePrecipitation * (1 + profile.precipSeasonality * -seasonalFactor * 0.6) + (random() - 0.5) * 20
      );

      data.push({
        city,
        month: month + 1,
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.round(humidity * 10) / 10,
        precipitation: Math.round(precipitation * 10) / 10
      });
    }
  }

  return data;
}

export function getCities(): string[] {
  return [...CITIES];
}

export function getMonthCount(): number {
  return MONTHS;
}
