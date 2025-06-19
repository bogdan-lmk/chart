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

// Timeframe multipliers (how many 15m periods in each timeframe)
const TIMEFRAME_MULTIPLIERS: Record<Timeframe, number> = {
  '15m': 1,   // 1 * 15m = 15m
  '1h': 4,    // 4 * 15m = 1h
  '4h': 16,   // 16 * 15m = 4h
  '12h': 48,  // 48 * 15m = 12h
  '1d': 96    // 96 * 15m = 1d
};

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
function aggregateOHLCData(data: OHLCDataPoint[], multiplier: number): OHLCDataPoint[] {
  if (multiplier === 1) {
    return data; // Return original 15m data
  }

  const aggregated: OHLCDataPoint[] = [];
  
  for (let i = 0; i < data.length; i += multiplier) {
    const chunk = data.slice(i, i + multiplier);
    
    if (chunk.length === 0) continue;
    
    // Get the first timestamp of the period (start of the candle)
    const time = chunk[0].time;
    
    // Aggregate OHLC values
    const open = chunk[0].open;
    const close = chunk[chunk.length - 1].close;
    const high = Math.max(...chunk.map(item => item.high));
    const low = Math.min(...chunk.map(item => item.low));
    const volume = chunk.reduce((sum, item) => sum + item.volume, 0);
    
    aggregated.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
  }
  
  return aggregated;
}

// Get aggregated data for specific timeframe
function getDataForTimeframe(data: OHLCDataPoint[], timeframe: Timeframe): OHLCDataPoint[] {
  const multiplier = TIMEFRAME_MULTIPLIERS[timeframe];
  return aggregateOHLCData(data, multiplier);
}

export const data = transformData(rawData);
export const btcData = transformOHLCData(btcOhlcData);

// Export function to get Bitcoin data for specific timeframe
export function getBitcoinDataForTimeframe(timeframe: Timeframe): OHLCDataPoint[] {
  return getDataForTimeframe(btcData, timeframe);
}

// Helper function to get timeframe info
export function getTimeframeInfo(timeframe: Timeframe): { multiplier: number; interval: string } {
  const multiplier = TIMEFRAME_MULTIPLIERS[timeframe];
  const intervals: Record<Timeframe, string> = {
    '15m': '15 minutes',
    '1h': '1 hour',
    '4h': '4 hours',
    '12h': '12 hours',
    '1d': '1 day'
  };
  
  return {
    multiplier,
    interval: intervals[timeframe]
  };
}

export type { DataPoint, OHLCDataPoint };