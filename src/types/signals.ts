export interface TradingSignal {
  timestamp: number; // Unix timestamp в секундах
  signal: 'buy' | 'sell';
}