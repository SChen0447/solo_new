export class ScoreManager {
  private score: number = 0;
  private stars: number = 0;
  private multiplier: number = 1.0;
  private starValue: number = 50;
  private layerThreshold: number = 20;
  private layerCount: number = 0;

  public reset(): void {
    this.score = 0;
    this.stars = 0;
    this.multiplier = 1.0;
    this.layerCount = 0;
  }

  public collectStar(): void {
    this.stars++;
    this.score += Math.floor(this.starValue * this.multiplier);
  }

  public updateLayerCount(layers: number): void {
    const newLayerCount = Math.floor(layers / this.layerThreshold);
    if (newLayerCount > this.layerCount) {
      const diff = newLayerCount - this.layerCount;
      this.multiplier += diff * 0.1;
      this.layerCount = newLayerCount;
    }
  }

  public getScore(): number {
    return this.score;
  }

  public getStars(): number {
    return this.stars;
  }

  public getMultiplier(): number {
    return this.multiplier;
  }
}
