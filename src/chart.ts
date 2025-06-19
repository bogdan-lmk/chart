import { createChart, LineSeries, HistogramSeries, ColorType } from 'lightweight-charts';
import type { UTCTimestamp } from 'lightweight-charts';

interface DataPoint {
    time: UTCTimestamp;
    total: number;
    values: number;
}

const CHART_CONTAINER_ID = 'chart';
const SERIES_COLOR = '#2962FF';
const DEFAULT_CHART_OPTIONS = {
    layout: {
        textColor: 'black',
        background: {type: ColorType.Solid, color: 'white'},
    },
};

function getChartContainer(): HTMLElement | null {
    return document.getElementById(CHART_CONTAINER_ID);
}

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
