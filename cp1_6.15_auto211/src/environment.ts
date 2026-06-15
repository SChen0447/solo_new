export interface EnvironmentState {
  temperature: number;
  nutrientConcentration: number;
  isDisturbed: boolean;
  ventPosition: { x: number; y: number };
  ventRadius: number;
  energySourceRadius: number;
}

export interface EnvironmentConfig {
  minTemperature: number;
  maxTemperature: number;
  initialTemperature: number;
  temperatureFluctuationInterval: number;
  temperatureFluctuationAmount: number;
  nutrientBase: number;
  nutrientTemperatureFactor: number;
  disturbanceInterval: number;
  disturbanceDuration: number;
  disturbanceProbability: number;
  ventRadius: number;
  energySourceRadius: number;
}

const DEFAULT_CONFIG: EnvironmentConfig = {
  minTemperature: 180,
  maxTemperature: 450,
  initialTemperature: 300,
  temperatureFluctuationInterval: 5000,
  temperatureFluctuationAmount: 10,
  nutrientBase: 50,
  nutrientTemperatureFactor: 0.01,
  disturbanceInterval: 15000,
  disturbanceDuration: 3000,
  disturbanceProbability: 0.3,
  ventRadius: 40,
  energySourceRadius: 30
};

export class Environment {
  private state: EnvironmentState;
  private config: EnvironmentConfig;
  private canvasWidth: number;
  private canvasHeight: number;
  private lastTemperatureFluctuation: number = 0;
  private lastDisturbanceCheck: number = 0;
  private disturbanceEndTime: number = 0;
  private userTemperatureOverride: number | null = null;

  constructor(canvasWidth: number, canvasHeight: number, config?: Partial<EnvironmentConfig>) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      temperature: this.config.initialTemperature,
      nutrientConcentration: this.config.nutrientBase,
      isDisturbed: false,
      ventPosition: {
        x: canvasWidth / 2,
        y: canvasHeight / 2
      },
      ventRadius: this.config.ventRadius,
      energySourceRadius: this.config.energySourceRadius
    };
  }

  public update(currentTime: number): void {
    this.updateTemperature(currentTime);
    this.updateNutrients();
    this.updateDisturbance(currentTime);
  }

  private updateTemperature(currentTime: number): void {
    if (this.userTemperatureOverride !== null) {
      this.state.temperature = this.userTemperatureOverride;
      return;
    }

    if (currentTime - this.lastTemperatureFluctuation >= this.config.temperatureFluctuationInterval) {
      const fluctuation = (Math.random() - 0.5) * 2 * this.config.temperatureFluctuationAmount;
      this.state.temperature = Math.max(
        240,
        Math.min(360, this.state.temperature + fluctuation)
      );
      this.lastTemperatureFluctuation = currentTime;
    }
  }

  private updateNutrients(): void {
    const temperatureEffect = (this.state.temperature - 300) * this.config.nutrientTemperatureFactor;
    this.state.nutrientConcentration = Math.max(
      0,
      Math.min(100, this.config.nutrientBase + temperatureEffect)
    );
  }

  private updateDisturbance(currentTime: number): void {
    if (this.state.isDisturbed) {
      if (currentTime >= this.disturbanceEndTime) {
        this.state.isDisturbed = false;
      }
      return;
    }

    if (currentTime - this.lastDisturbanceCheck >= this.config.disturbanceInterval) {
      if (Math.random() < this.config.disturbanceProbability) {
        this.state.isDisturbed = true;
        this.disturbanceEndTime = currentTime + this.config.disturbanceDuration;
      }
      this.lastDisturbanceCheck = currentTime;
    }
  }

  public setTemperature(temperature: number): void {
    this.userTemperatureOverride = Math.max(
      this.config.minTemperature,
      Math.min(this.config.maxTemperature, temperature)
    );
    this.state.temperature = this.userTemperatureOverride;
  }

  public releaseUserTemperatureOverride(): void {
    this.userTemperatureOverride = null;
  }

  public boostNutrients(percentage: number): void {
    this.config.nutrientBase = Math.min(100, this.config.nutrientBase * (1 + percentage / 100));
  }

  public triggerExtremeEvent(): void {
    this.state.temperature = Math.min(this.config.maxTemperature, this.state.temperature + 50);
    this.state.isDisturbed = true;
    this.disturbanceEndTime = performance.now() + 5000;
  }

  public getState(): Readonly<EnvironmentState> {
    return { ...this.state };
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.state.ventPosition = {
      x: width / 2,
      y: height / 2
    };
  }
}
