// src/chart.ts - Исправленная версия

import { createChart, LineSeries, HistogramSeries, ColorType } from 'lightweight-charts';
import type { UTCTimestamp } from 'lightweight-charts';
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

import type { OHLCDataPoint, Timeframe } from './dataService';
import { TradingSignal } from './types/signals';

let signalSeries: am5xy.LineSeries | null = null;

interface DataPoint {
    time: UTCTimestamp;
    total: number;
    values: number;
}

// Интерфейс для данных свечей
interface CandleDataItem {
    date: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const CHART_CONTAINER_ID = 'chart';
const BTC_CHART_CONTAINER_ID = 'btc-chart';
const SERIES_COLOR = '#2962FF';
const DEFAULT_CHART_OPTIONS = {
    layout: {
        textColor: 'black',
        background: {type: ColorType.Solid, color: 'white'},
    },
};

// Timeframe base intervals for amCharts5
const TIMEFRAME_INTERVALS: Record<Timeframe, any> = {
    '15m': { timeUnit: "minute", count: 15 },
    '1h': { timeUnit: "hour", count: 1 },
    '4h': { timeUnit: "hour", count: 4 },
    '12h': { timeUnit: "hour", count: 12 },
    '1d': { timeUnit: "day", count: 1 }
};

// Offset ratios for signal markers depending on timeframe
const OFFSET_RATIOS: Record<Timeframe, number> = {
    '15m': 0.1,
    '1h': 0.08,
    '4h': 0.06,
    '12h': 0.05,
    '1d': 0.04
};

function getChartContainer(): HTMLElement | null {
    return document.getElementById(CHART_CONTAINER_ID);
}

function getBtcChartContainer(): HTMLElement | null {
    return document.getElementById(BTC_CHART_CONTAINER_ID);
}

// Original indicator chart setup
export function setupChart(dataPoints: DataPoint[]): void {
    const container = getChartContainer();
    if (!container) return;

    const chart = createChart(container, DEFAULT_CHART_OPTIONS);
    const histogramSeries = chart.addSeries(HistogramSeries, { color: '#26a69a' });
    const histogramData = dataPoints.map(({ time, total }) => ({ time, value: total }));
    histogramSeries.setData(histogramData);

    const lineSeries = chart.addSeries(LineSeries, {color: SERIES_COLOR});
    const data = dataPoints.map(({ time, values }) => ({ time: time , value: values }));
    lineSeries.setData(data);
    chart.timeScale().fitContent();
}

// Bitcoin OHLC chart setup with amCharts5
let btcChart: am5.Root | null = null;
let candlestickSeries: am5xy.CandlestickSeries | null = null;
let xAxis: am5xy.DateAxis<any> | null = null;

export function setupBitcoinChart(ohlcData: OHLCDataPoint[], timeframe: Timeframe = '15m'): void {
    const container = getBtcChartContainer();
    if (!container) return;

    if (btcChart) {
        btcChart.dispose();
    }

    btcChart = am5.Root.new(container);
    btcChart.setThemes([am5themes_Animated.new(btcChart)]);

    const chart = btcChart.container.children.push(
        am5xy.XYChart.new(btcChart, {
            panX: true,
            panY: true,
            wheelX: "panX",
            wheelY: "zoomX",
            layout: btcChart.verticalLayout
        })
    );

    const baseInterval = TIMEFRAME_INTERVALS[timeframe];

    xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(btcChart, {
            maxZoomCount: undefined,
            minZoomCount: 1,
            baseInterval: baseInterval,
            renderer: am5xy.AxisRendererX.new(btcChart, {
                minorGridEnabled: true,
                minGridDistance: 30
            }),
            tooltip: am5.Tooltip.new(btcChart, {}),
            strictMinMax: false
        })
    );

    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(btcChart, {
            renderer: am5xy.AxisRendererY.new(btcChart, {
                pan: "zoom",
                minGridDistance: 20
            }),
            tooltip: am5.Tooltip.new(btcChart, {}),
            strictMinMax: false,
            extraMin: 0.02,
            extraMax: 0.02
        })
    );

    candlestickSeries = chart.series.push(
        am5xy.CandlestickSeries.new(btcChart, {
            name: `BTC/USD (${timeframe})`,
            xAxis: xAxis,
            yAxis: yAxis,
            valueYField: "close",
            openValueYField: "open",
            lowValueYField: "low",
            highValueYField: "high",
            valueXField: "date",
            tooltip: am5.Tooltip.new(btcChart, {
                pointerOrientation: "horizontal",
                labelText: "Open: ${openValueY.formatNumber('#,###.00')}\nHigh: ${highValueY.formatNumber('#,###.00')}\nLow: ${lowValueY.formatNumber('#,###.00')}\nClose: ${valueY.formatNumber('#,###.00')}\nVolume: ${volume.formatNumber('#,###.00')}"
            })
        })
    );

    const chartData = ohlcData.map(point => ({
        date: point.time * 1000,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume
    }));

    // Сохраняем данные свечей в глобальной переменной для mock-сигналов
    (window as any).__candleData = chartData;
    candlestickSeries.data.setAll(chartData);

    const cursor = chart.set("cursor", am5xy.XYCursor.new(btcChart, {
        behavior: "none"
    }));
    cursor.lineY.set("visible", false);

    if (chartData.length > 0) {
        setTimeout(() => {
            if (xAxis) {
                xAxis.zoomToValues(chartData[0].date, chartData[chartData.length - 1].date);
            }
        }, 100);
    }

    candlestickSeries.appear(1000);
    chart.appear(1000, 100);

    console.log(`Bitcoin chart setup complete: ${chartData.length} candles for ${timeframe}`);
}

export function updateBitcoinChart(ohlcData: OHLCDataPoint[], timeframe: Timeframe): void {
    if (!candlestickSeries || !xAxis || !btcChart) {
        setupBitcoinChart(ohlcData, timeframe);
        return;
    }

    const baseInterval = TIMEFRAME_INTERVALS[timeframe];
    xAxis.set("baseInterval", baseInterval);
    candlestickSeries.set("name", `BTC/USD (${timeframe})`);

    const chartData = ohlcData.map(point => ({
        date: point.time * 1000,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume
    }));

    // Update global candle data so mock signals align with the current timeframe
    (window as any).__candleData = chartData;

    candlestickSeries.data.setAll(chartData);
    
    if (chartData.length > 0) {
        setTimeout(() => {
            if (xAxis) {
                xAxis.zoomToValues(chartData[0].date, chartData[chartData.length - 1].date);
            }
        }, 100);
        
        console.log(`Chart updated: ${chartData.length} candles for ${timeframe}`);
    }
}

// Функция для добавления сигналов
export function addTradingSignals(signals: TradingSignal[], offsetRatio?: number): void {
    if (!btcChart || !candlestickSeries || !xAxis) {
        console.warn('Bitcoin chart not initialized');
        return;
    }

    if (signalSeries) {
        signalSeries.dispose();
        signalSeries = null;
    }

    signalSeries = candlestickSeries.chart!.series.push(
        am5xy.LineSeries.new(btcChart, {
            xAxis: xAxis,
            yAxis: candlestickSeries.get("yAxis"),
            valueYField: "value",
            valueXField: "date",
            visible: true
        })
    );

    const candleData = candlestickSeries.data.values as CandleDataItem[];
    const signalsByCandle = new Map<number, TradingSignal>();

    for (const signal of signals) {
        const signalTime = signal.timestamp * 1000;

        let closestCandle = candleData[0];
        let minDiff = Math.abs(candleData[0].date - signalTime);

        for (const candle of candleData) {
            const diff = Math.abs(candle.date - signalTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestCandle = candle;
            }
        }

        signalsByCandle.set(closestCandle.date, signal);
    }

    const signalData = Array.from(signalsByCandle.entries()).map(([candleDate, signal]) => {
        const signalTime = signal.timestamp * 1000;
        const exactCandle = candleData.find(c => c.date === candleDate);
        if (!exactCandle) return null;

        if (!candlestickSeries) return null;
        const timeframe = candlestickSeries.get("name", "")?.match(/\((.*?)\)/)?.[1] as Timeframe || '15m';
        const maxDiff = {
            '15m': 15 * 60 * 1000,
            '1h': 30 * 60 * 1000,
            '4h': 2 * 60 * 60 * 1000,
            '12h': 6 * 60 * 60 * 1000,
            '1d': 12 * 60 * 60 * 1000
        }[timeframe];

        const ratio = offsetRatio ?? OFFSET_RATIOS[timeframe];

        const signalDiff = Math.abs(exactCandle.date - signalTime);
        if (signalDiff > maxDiff) return null;

        const candleRange = exactCandle.high - exactCandle.low || 1;
        const visualOffset = candleRange * ratio;

        if (!candlestickSeries?.get("yAxis")) return null;
        let signalValue = signal.signal === 'buy'
            ? exactCandle.low - visualOffset
            : exactCandle.high + visualOffset;

        const yAxisMin = candleData.reduce((min, c) => Math.min(min, c.low), Infinity);
        const yAxisMax = candleData.reduce((max, c) => Math.max(max, c.high), -Infinity);

        const finalValue = Math.min(Math.max(signalValue, yAxisMin * 0.95), yAxisMax * 1.05);

        return {
            date: candleDate,
            value: finalValue,
            signal: signal.signal
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    signalSeries.data.setAll(signalData);

    signalSeries.set("visible", true);
    signalSeries.set("stroke", am5.color("#fff")); // Невидимая линия

    signalSeries.bullets.push((_root, _series, dataItem) => {
        const ctx = dataItem.dataContext as any;
        const isBuy = ctx?.signal === "buy";
        const color = isBuy ? am5.color("#00ff00") : am5.color("#ff0000");
        const triangle = am5.Triangle.new(btcChart!, {
            width: 10,
            height: 10,
            fill: color,
            stroke: color,
            centerX: am5.p50,
            centerY: am5.p50,
            rotation: isBuy ? 0 : 180,
            tooltipText: "{signal} signal at {date}\nPrice: {valueY}"
        });

        return am5.Bullet.new(btcChart!, { sprite: triangle });
    });

    signalSeries.set("name", "");
    console.log(`Added ${signalData.length} trading signals`);
}


// Cleanup function
export function disposeBitcoinChart(): void {
    if (signalSeries) {
        signalSeries.dispose();
        signalSeries = null;
    }
    if (btcChart) {
        btcChart.dispose();
        btcChart = null;
        candlestickSeries = null;
        xAxis = null;
    }
}
