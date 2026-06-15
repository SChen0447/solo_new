export function simulateNextPrice(currentPrice: number): { price: number; volume: number } {
  const drift = (Math.random() - 0.48) * 0.02;
  const newPrice = currentPrice * (1 + drift);
  const volume = Math.floor(Math.random() * 10000) + 1000;
  return { price: Math.round(newPrice * 100) / 100, volume };
}

export function calcVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
  return Math.round(Math.sqrt(variance) * Math.sqrt(252) * 10000) / 100;
}

export function calcMaxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;
  let maxPrice = prices[0];
  let maxDrawdown = 0;
  for (const price of prices) {
    if (price > maxPrice) maxPrice = price;
    const drawdown = (maxPrice - price) / maxPrice;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  return Math.round(maxDrawdown * 10000) / 100;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}
