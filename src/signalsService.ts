// src/services/signalsService.ts

import { TradingSignal } from './types/signals';
import { Timeframe } from './dataService';

export async function fetchTradingSignals(
  _ticker: string = 'BTC',
  _timeframe: Timeframe
): Promise<TradingSignal[]> {
  try {
    // Временное решение - используем mock-данные
    // TODO: Раскомментировать когда API будет готово
    /*
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
    */
    return getMockSignals();
  } catch (error) {
    console.error('Error in signals service:', error);
    return getMockSignals();
  }
}

// Тестовые данные
export function getMockSignals(): TradingSignal[] {
  // Получаем данные свечей из chart.ts
  const candleData = (window as any).__candleData || [];
  
  if (candleData.length === 0) {
    console.warn('No candle data available for mock signals');
    return [];
  }

  // Берем временной диапазон из данных свечей
  const firstCandle = candleData[0];
  const lastCandle = candleData[candleData.length - 1];
  const startTime = firstCandle.date;
  const endTime = lastCandle.date;
  const range = endTime - startTime;

  // Генерируем 6 сигналов равномерно распределенных по диапазону
  const interval = range / 7; // 7 интервалов для 6 сигналов
  
  return [
    { timestamp: Math.floor((startTime + interval) / 1000), signal: 'buy' },
    { timestamp: Math.floor((startTime + 2 * interval) / 1000), signal: 'sell' },
    { timestamp: Math.floor((startTime + 3 * interval) / 1000), signal: 'buy' },
    { timestamp: Math.floor((startTime + 4 * interval) / 1000), signal: 'sell' },
    { timestamp: Math.floor((startTime + 5 * interval) / 1000), signal: 'buy' },
    { timestamp: Math.floor((startTime + 6 * interval) / 1000), signal: 'sell' }
  ];
}
