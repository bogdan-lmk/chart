import type { UTCTimestamp } from 'lightweight-charts';

import { rawData, btcOhlcData } from '../data/data';

// Define raw row type and data point interface
type RawRow = string[];

interface DataPoint {
  time: UTCTimestamp;
  total: number;
  value: number;
}

// Transform raw rows into DataPoints for the chart
function transformData(rawData: RawRow[]): DataPoint[] {
  return rawData.map(parseRow);
}

const div = 100000000

function parseRow(row: RawRow): DataPoint {
  const [, dateStr, , totalStr, top20Str] = row;
  return {
    time: formatDateTime(dateStr),
    total: parseNumber(totalStr) / div,
    value: parseNumber(top20Str),
  };
}

function formatDateTime(dateStr: string): UTCTimestamp {
  // Convert "YYYY-MM-DD HH:mm:ss" to Unix timestamp in seconds
  return Math.floor(new Date(dateStr).getTime() / 1000) as UTCTimestamp;
}

function parseNumber(value: string): number {
  return parseFloat(value);
}

export const data = transformData(rawData);
