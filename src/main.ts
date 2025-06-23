// src/main.ts - Исправленная версия

import { setupChart, setupBitcoinChart, updateBitcoinChart, disposeBitcoinChart, addTradingSignals } from './chart';
import { data, getBitcoinDataForTimeframe, getTimeframeInfo, type Timeframe } from './dataService';
import { fetchTradingSignals, getMockSignals } from './signalsService';
import { TradingSignal } from './types/signals';

let currentSignals: TradingSignal[] = [];

// Current selected timeframe
let currentTimeframe: Timeframe = '15m';

// Use Unix timestamps directly for the indicator chart
const chartData = data.map(point => ({
  time: point.time,
  values: point.value,
  total: point.total
}));

// Initialize charts
async function initializeCharts(): Promise<void> {
  setupChart(chartData);
  
  const btcData = getBitcoinDataForTimeframe(currentTimeframe);
  setupBitcoinChart(btcData, currentTimeframe);
  
  // Загружаем начальные сигналы
  try {
    currentSignals = await fetchTradingSignals('BTC', currentTimeframe);
    console.log('Fetched signals:', currentSignals);
    addTradingSignals(currentSignals);
    console.log(`Initial signals loaded: ${currentSignals.length}`);
  } catch (error) {
    console.error('Error loading initial signals:', error);
    // Используем тестовые сигналы даже при ошибке
    currentSignals = getMockSignals();
    console.log('Mock signals:', currentSignals);
    addTradingSignals(currentSignals);
    console.log(`Using mock signals: ${currentSignals.length}`);
    
    // Проверяем, что сигналы добавлены
    setTimeout(() => {
      console.log('Current signals after adding:', currentSignals);
    }, 1000);
  }
}

// Setup timeframe selector
function setupTimeframeSelector(): void {
  const timeframeButtons = document.querySelectorAll('.timeframe-btn');
  
  timeframeButtons.forEach(button => {
    button.addEventListener('click', async (event) => {
      const target = event.target as HTMLButtonElement;
      const timeframe = target.dataset.timeframe as Timeframe;
      
      if (timeframe && timeframe !== currentTimeframe) {
        target.disabled = true;
        target.textContent = 'Loading...';
        
        try {
          // Обновляем активную кнопку
          timeframeButtons.forEach(btn => {
            const button = btn as HTMLButtonElement;
            button.classList.remove('active');
            button.disabled = false;
            const originalTimeframe = button.dataset.timeframe;
            if (originalTimeframe) {
              button.textContent = originalTimeframe;
            }
          });
          target.classList.add('active');
          
          currentTimeframe = timeframe;
          
          // Получаем новые данные
          const newBtcData = getBitcoinDataForTimeframe(timeframe);
          updateBitcoinChart(newBtcData, timeframe);
          
          // Загружаем и отображаем сигналы
          currentSignals = await fetchTradingSignals('BTC', timeframe);
          addTradingSignals(currentSignals);
          
          console.log(`Switched to ${timeframe}, loaded ${currentSignals.length} signals`);
          
          target.textContent = timeframe;
          
        } catch (error) {
          console.error('Error switching timeframe:', error);
          target.classList.remove('active');
          target.textContent = timeframe;
          
          const prevButton = document.querySelector(`[data-timeframe="${currentTimeframe}"]`);
          if (prevButton) {
            prevButton.classList.add('active');
          }
        } finally {
          target.disabled = false;
        }
      }
    });
  });
}

// Setup error handling
function setupErrorHandling(): void {
  window.addEventListener('error', (event) => {
    console.error('Chart error:', event.error);
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
}

// Cleanup on page unload
function setupCleanup(): void {
  window.addEventListener('beforeunload', () => {
    disposeBitcoinChart();
  });
}

// Debug function to show aggregation info
function logAggregationInfo(): void {
  console.log('=== Bitcoin Data Aggregation Info ===');
  
  const timeframes: Timeframe[] = ['15m', '1h', '4h', '12h', '1d'];
  
  timeframes.forEach(tf => {
    const data = getBitcoinDataForTimeframe(tf);
    const info = getTimeframeInfo(tf);
    console.log(`${tf}: ${data.length} candles (${info.interval})`);
  });
}

// Main initialization
function main(): void {
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initializeApplication();
      });
    } else {
      initializeApplication();
    }
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

async function initializeApplication(): Promise<void> {
  setupErrorHandling();
  
  await initializeCharts();
  
  setupTimeframeSelector();
  setupCleanup();
  logAggregationInfo();
  
  console.log('Application initialized successfully');
}

// Start the application
main();
