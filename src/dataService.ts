import type { UTCTimestamp } from 'lightweight-charts';
import { rawData, btcOhlcData } from '../data/data';

// Define raw row type and data point interface
type RawRow = string[];

interface DataPoint {
  time: UTCTimestamp;
  total: number;
  value: number;
}

interface OHLCDataPoint {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Available timeframes
export type Timeframe = '15m' | '1h' | '4h' | '12h' | '1d';

// Calculate milliseconds for each timeframe
function getTimeframeMs(timeframe: Timeframe): number {
  const now = new Date();
  const msMap: Record<Timeframe, number> = {
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000
  };
  return msMap[timeframe];
}

// Transform raw rows into DataPoints for the indicator chart
function transformData(rawData: RawRow[]): DataPoint[] {
  return rawData.map(parseRow);
}

// Transform OHLC raw rows into OHLCDataPoints for the Bitcoin chart
function transformOHLCData(ohlcData: RawRow[]): OHLCDataPoint[] {
  return ohlcData.map(parseOHLCRow);
}

const div = 100000000;

function parseRow(row: RawRow): DataPoint {
  const [, dateStr, , totalStr, top20Str] = row;
  return {
    time: formatDateTime(dateStr),
    total: parseNumber(totalStr) / div,
    value: parseNumber(top20Str),
  };
}

function parseOHLCRow(row: RawRow): OHLCDataPoint {
  const [, dateStr, , openStr, highStr, lowStr, closeStr, volumeStr] = row;
  return {
    time: formatDateTime(dateStr),
    open: parseNumber(openStr),
    high: parseNumber(highStr),
    low: parseNumber(lowStr),
    close: parseNumber(closeStr),
    volume: parseNumber(volumeStr),
  };
}

function formatDateTime(dateStr: string): UTCTimestamp {
  // Convert "YYYY-MM-DD HH:mm:ss" to Unix timestamp in seconds
  return Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;
}

function parseNumber(value: string): number {
  return parseFloat(value);
}

// Aggregate OHLC data for different timeframes
function aggregateOHLCData(data: OHLCDataPoint[], timeframeMs: number): OHLCDataPoint[] {
  if (timeframeMs <= 15 * 60 * 1000) return data; // 15m or less

  const aggregated: OHLCDataPoint[] = [];
  let currentWindowStart = data[0]?.time ? new Date(data[0].time * 1000) : new Date();
  let currentWindowEnd = new Date(currentWindowStart.getTime() + timeframeMs);
  let windowData: OHLCDataPoint[] = [];

  for (const point of data) {
    const pointDate = new Date(point.time * 1000);
    
    if (pointDate < currentWindowEnd) {
      windowData.push(point);
    } else {
      if (windowData.length > 0) {
        const time = Math.floor(currentWindowStart.getTime() / 1000) as UTCTimestamp;
        const open = windowData[0].open;
        const close = windowData[windowData.length - 1].close;
        const high = Math.max(...windowData.map(item => item.high));
        const low = Math.min(...windowData.map(item => item.low));
        const volume = windowData.reduce((sum, item) => sum + item.volume, 0);

        aggregated.push({ time, open, high, low, close, volume });
      }

      // Move to next window
      currentWindowStart = new Date(currentWindowEnd);
      currentWindowEnd = new Date(currentWindowStart.getTime() + timeframeMs);
      windowData = [point];
    }
  }

  // Add last window if it has data
  if (windowData.length > 0) {
    const time = Math.floor(currentWindowStart.getTime() / 1000) as UTCTimestamp;
    const open = windowData[0].open;
    const close = windowData[windowData.length - 1].close;
    const high = Math.max(...windowData.map(item => item.high));
    const low = Math.min(...windowData.map(item => item.low));
    const volume = windowData.reduce((sum, item) => sum + item.volume, 0);

    aggregated.push({ time, open, high, low, close, volume });
  }

  return aggregated;
}


// Get aggregated data for specific timeframe
function getDataForTimeframe(data: OHLCDataPoint[], timeframe: Timeframe): OHLCDataPoint[] {
  const timeframeMs = getTimeframeMs(timeframe);
  return aggregateOHLCData(data, timeframeMs);
}

export const data = transformData(rawData);
export const btcData = transformOHLCData(btcOhlcData);

// Export function to get Bitcoin data for specific timeframe
export function getBitcoinDataForTimeframe(timeframe: Timeframe): OHLCDataPoint[] {
  return getDataForTimeframe(btcData, timeframe);
}

// Helper function to get timeframe info
export function getTimeframeInfo(timeframe: Timeframe): { multiplier: number; interval: string } {
  const intervals: Record<Timeframe, string> = {
    '15m': '15 minutes',
    '1h': '1 hour',
    '4h': '4 hours',
    '12h': '12 hours',
    '1d': '1 day'
  };
  
  return {
    multiplier: getTimeframeMs(timeframe),
    interval: intervals[timeframe]
  };
}

export type { DataPoint, OHLCDataPoint };
