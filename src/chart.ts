import { createChart, LineSeries, HistogramSeries, ColorType } from 'lightweight-charts';
import type { UTCTimestamp } from 'lightweight-charts';
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import type { OHLCDataPoint, Timeframe } from './dataService';

interface DataPoint {
    time: UTCTimestamp;
    total: number;
    values: number;
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
const TIMEFRAME_INTERVALS: Record<Timeframe, { timeUnit: am5.time.Unit; count: number }> = {
    '15m': { timeUnit: "minute", count: 15 },
    '1h': { timeUnit: "hour", count: 1 },
    '4h': { timeUnit: "hour", count: 4 },
    '12h': { timeUnit: "hour", count: 12 },
    '1d': { timeUnit: "day", count: 1 }
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
    // Add histogram series for 'total' values
    const histogramSeries = chart.addSeries(HistogramSeries, { color: '#26a69a' });
    const histogramData = dataPoints.map(({ time, total }) => ({ time, value: total }));
    histogramSeries.setData(histogramData);

    const lineSeries = chart.addSeries(LineSeries, {color: SERIES_COLOR});
    // Cast time to UTCTimestamp to satisfy TypeScript nominal type
    const data = dataPoints.map(({ time, values }) => ({ time: time , value: values }));
    lineSeries.setData(data);
    chart.timeScale().fitContent();
}

// Bitcoin OHLC chart setup with amCharts5
let btcChart: am5.Root | null = null;
let candlestickSeries: am5xy.CandlestickSeries | null = null;
let xAxis: am5xy.DateAxis<am5xy.AxisRendererX> | null = null;

export function setupBitcoinChart(ohlcData: OHLCDataPoint[], timeframe: Timeframe = '15m'): void {
    const container = getBtcChartContainer();
    if (!container) return;

    // Dispose existing chart if it exists
    if (btcChart) {
        btcChart.dispose();
    }

    // Create root element
    btcChart = am5.Root.new(container);

    // Set themes
    btcChart.setThemes([am5themes_Animated.new(btcChart)]);

    // Create chart
    const chart = btcChart.container.children.push(
        am5xy.XYChart.new(btcChart, {
            panX: true,
            panY: true,
            wheelX: "panX",
            wheelY: "zoomX",
            layout: btcChart.verticalLayout
        })
    );

    // Get timeframe interval
    const baseInterval = TIMEFRAME_INTERVALS[timeframe];

    // Create X-axis (DateTime) with proper interval
    xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(btcChart, {
            maxZoomCount: 50,
            baseInterval: baseInterval,
            renderer: am5xy.AxisRendererX.new(btcChart, {
                minorGridEnabled: true,
                minGridDistance: 50
            }),
            tooltip: am5.Tooltip.new(btcChart, {})
        })
    );

    // Create Y-axis (Value)
    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(btcChart, {
            renderer: am5xy.AxisRendererY.new(btcChart, {
                pan: "zoom"
            }),
            tooltip: am5.Tooltip.new(btcChart, {})
        })
    );

    // Create candlestick series
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

    // Transform data for amCharts5
    const chartData = ohlcData.map(point => ({
        date: point.time * 1000, // Convert to milliseconds
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume
    }));

    // Set data
    candlestickSeries.data.setAll(chartData);

    // Add cursor
    const cursor = chart.set("cursor", am5xy.XYCursor.new(btcChart, {
        behavior: "zoomXY"
    }));
    cursor.lineY.set("visible", false);

    // Make chart appear animated
    candlestickSeries.appear(1000);
    chart.appear(1000, 100);
}

// Update Bitcoin chart with new timeframe data
export function updateBitcoinChart(ohlcData: OHLCDataPoint[], timeframe: Timeframe): void {
    if (!candlestickSeries || !xAxis || !btcChart) {
        setupBitcoinChart(ohlcData, timeframe);
        return;
    }

    // Update base interval for the new timeframe
    const baseInterval = TIMEFRAME_INTERVALS[timeframe];
    xAxis.set("baseInterval", baseInterval);

    // Update series name
    candlestickSeries.set("name", `BTC/USD (${timeframe})`);

    // Transform data for amCharts5
    const chartData = ohlcData.map(point => ({
        date: point.time * 1000, // Convert to milliseconds
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volume
    }));

    // Update data with animation
    candlestickSeries.data.setAll(chartData);
    
    // Zoom out to show all data
    if (chartData.length > 0) {
        xAxis.zoom(0, 1);
    }
}

// Cleanup function
export function disposeBitcoinChart(): void {
    if (btcChart) {
        btcChart.dispose();
        btcChart = null;
        candlestickSeries = null;
        xAxis = null;
    }
}
