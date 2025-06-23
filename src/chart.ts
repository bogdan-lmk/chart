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
let xAxis: am5xy.DateAxis<any> | null = null;

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

    // Create X-axis (DateTime) with proper interval - убираем ограничения
    xAxis = chart.xAxes.push(
        am5xy.DateAxis.new(btcChart, {
            // Убираем maxZoomCount - это ограничивает количество отображаемых свечей
            maxZoomCount: undefined,
            // Устанавливаем минимальное количество для отображения всех данных
            minZoomCount: 1,
            baseInterval: baseInterval,
            renderer: am5xy.AxisRendererX.new(btcChart, {
                minorGridEnabled: true,
                // Уменьшаем минимальное расстояние для отображения большего количества меток
                minGridDistance: 30
            }),
            tooltip: am5.Tooltip.new(btcChart, {}),
            // Отключаем автоматическое скрытие меток
            strictMinMax: false
        })
    );

    // Create Y-axis (Value) - улучшаем масштабирование
    const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(btcChart, {
            renderer: am5xy.AxisRendererY.new(btcChart, {
                pan: "zoom",
                // Улучшаем отображение меток на Y оси
                minGridDistance: 20
            }),
            tooltip: am5.Tooltip.new(btcChart, {}),
            // Автоматическое масштабирование по данным
            strictMinMax: false,
            // Добавляем небольшие отступы сверху и снизу
            extraMin: 0.02,
            extraMax: 0.02
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
        behavior: "none"
    }));
    cursor.lineY.set("visible", false);

    // Настраиваем начальный зум для отображения всех данных
    if (chartData.length > 0) {
        // Показываем все данные при загрузке - используем setTimeout для корректной инициализации
        setTimeout(() => {
            if (xAxis) {
                xAxis.zoomToValues(chartData[0].date, chartData[chartData.length - 1].date);
            }
        }, 100);
    }

    // Make chart appear animated
    candlestickSeries.appear(1000);
    chart.appear(1000, 100);

    console.log(`Bitcoin chart setup complete: ${chartData.length} candles for ${timeframe}`);
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
    
    // Показываем все данные после обновления
    if (chartData.length > 0) {
        // Используем setTimeout для корректного обновления после смены данных
        setTimeout(() => {
            if (xAxis) {
                xAxis.zoomToValues(chartData[0].date, chartData[chartData.length - 1].date);
            }
        }, 100);
        
        console.log(`Chart updated: ${chartData.length} candles for ${timeframe}`);
        console.log(`Date range: ${new Date(chartData[0].date).toISOString()} to ${new Date(chartData[chartData.length - 1].date).toISOString()}`);
    }
}

// Добавить эту функцию в конец файла
export function addTradingSignals(signals: TradingSignal[]): void {
  if (!btcChart || !candlestickSeries || !xAxis) {
    console.warn('Bitcoin chart not initialized');
    return;
  }

  // Удаляем предыдущие сигналы
  if (signalSeries) {
    signalSeries.dispose();
    signalSeries = null;
  }

  // Создаем серию для сигналов
  signalSeries = candlestickSeries.chart!.series.push(
    am5xy.LineSeries.new(btcChart, {
      name: "Trading Signals",
      xAxis: xAxis,
      yAxis: candlestickSeries.get("yAxis"),
      valueYField: "value",
      valueXField: "date",
      visible: false // Скрываем линию
    })
  );

  // Получаем данные свечей
  const candleData = candlestickSeries.data.values;
  
  // Подготавливаем данные сигналов
  const signalData = signals.map(signal => {
    const signalTime = signal.timestamp * 1000;
    
    // Находим ближайшую свечу
    const nearestCandle = candleData.find((candle: any) => 
      Math.abs(candle.date - signalTime) < 900000 // 15 минут
    );
    
    if (!nearestCandle) return null;
    
    // Позиция сигнала
    const offset = (nearestCandle.high - nearestCandle.low) * 0.15;
    const signalValue = signal.signal === 'buy' 
      ? nearestCandle.low - offset
      : nearestCandle.high + offset;
    
    return {
      date: signalTime,
      value: signalValue,
      signal: signal.signal
    };
  }).filter(Boolean);

  signalSeries.data.setAll(signalData);

  // Создаем маркеры
  signalSeries.set("bullet", function(root, series, dataItem) {
    const container = am5.Container.new(root, {});
    const signalType = dataItem.dataContext.signal;
    
    // Треугольник
    container.children.push(
      am5.Graphics.new(root, {
        centerX: am5.p50,
        centerY: am5.p50,
        fill: signalType === 'buy' ? am5.color("#00C851") : am5.color("#FF4444"),
        stroke: am5.color("#FFFFFF"),
        strokeWidth: 2,
        draw: function(display) {
          if (signalType === 'buy') {
            // Треугольник вверх
            display.moveTo(0, 8);
            display.lineTo(-6, -4);
            display.lineTo(6, -4);
            display.lineTo(0, 8);
          } else {
            // Треугольник вниз
            display.moveTo(0, -8);
            display.lineTo(-6, 4);
            display.lineTo(6, 4);
            display.lineTo(0, -8);
          }
        }
      })
    );

    return am5.Bullet.new(root, {
      sprite: container
    });
  });

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