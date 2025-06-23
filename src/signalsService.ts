// src/services/signalsService.ts

import { TradingSignal } from './types/signals';
import { Timeframe } from './dataService';

export async function fetchTradingSignals(
  ticker: string = 'BTC', 
  timeframe: Timeframe
): Promise<TradingSignal[]> {
  try {
    // Здесь будет запрос к бэкенду
    const response = await fetch('/api/signals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ticker,
        timeframe
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const signals: TradingSignal[] = await response.json();
    return signals;
  } catch (error) {
    console.error('Error fetching signals:', error);
    
    // Возвращаем тестовые данные при ошибке
    return getMockSignals();
  }
}

// Тестовые данные
function getMockSignals(): TradingSignal[] {
  return [
    { timestamp: 1718193305, signal: 'buy' },   // 2025-06-12 10:15:05
    { timestamp: 1718198705, signal: 'sell' },  // 2025-06-12 11:45:05
    { timestamp: 1718204105, signal: 'buy' },   // 2025-06-12 13:15:05
    { timestamp: 1718280305, signal: 'sell' }   // 2025-06-13 10:25:05
  ];
}