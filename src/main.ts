import { setupChart, setupBitcoinChart, updateBitcoinChart, disposeBitcoinChart } from './chart';
import { data, getBitcoinDataForTimeframe, getTimeframeInfo, type Timeframe } from './dataService';

// Current selected timeframe
let currentTimeframe: Timeframe = '15m';

// Use Unix timestamps directly for the indicator chart
const chartData = data.map(point => ({
  time: point.time, // Use Unix timestamp directly
  values: point.value,
  total: point.total
}));

// Initialize charts
function initializeCharts(): void {
  // Initialize the indicator chart with data from dataService
  setupChart(chartData);
  
  // Initialize Bitcoin OHLC chart with default timeframe
  const btcData = getBitcoinDataForTimeframe(currentTimeframe);
  setupBitcoinChart(btcData, currentTimeframe);
  
  // Log initial data info
  const timeframeInfo = getTimeframeInfo(currentTimeframe);
  console.log(`Bitcoin chart initialized with ${currentTimeframe} (${timeframeInfo.interval})`);
  console.log(`Data points: ${btcData.length}`);
}

// Setup timeframe selector
function setupTimeframeSelector(): void {
  const timeframeButtons = document.querySelectorAll('.timeframe-btn');
  
  timeframeButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const target = event.target as HTMLButtonElement;
      const timeframe = target.dataset.timeframe as Timeframe;
      
      if (timeframe && timeframe !== currentTimeframe) {
        // Show loading state
        target.disabled = true;
        target.textContent = 'Loading...';
        
        try {
          // Update active button
          timeframeButtons.forEach(btn => {
            const button = btn as HTMLButtonElement;
            button.classList.remove('active');
            button.disabled = false;
            // Restore original text
            const originalTimeframe = button.dataset.timeframe;
            if (originalTimeframe) {
              button.textContent = originalTimeframe;
            }
          });
          target.classList.add('active');
          
          // Update current timeframe
          currentTimeframe = timeframe;
          
          // Get new data for the timeframe
          const newBtcData = getBitcoinDataForTimeframe(timeframe);
          
          // Update Bitcoin chart with new timeframe data
          updateBitcoinChart(newBtcData, timeframe);
          
          // Log timeframe change
          const timeframeInfo = getTimeframeInfo(timeframe);
          console.log(`Switched to ${timeframe} (${timeframeInfo.interval})`);
          console.log(`Data points: ${newBtcData.length}`);
          console.log(`Multiplier: ${timeframeInfo.multiplier}x 15m periods`);
          
          // Restore button text
          target.textContent = timeframe;
          
        } catch (error) {
          console.error('Error switching timeframe:', error);
          
          // Restore button state on error
          target.classList.remove('active');
          target.textContent = timeframe;
          
          // Re-activate previous timeframe button
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
    console.log(`${tf}: ${data.length} candles (${info.interval}, ${info.multiplier}x aggregation)`);
  });
  
  console.log('=====================================');
}

// Main initialization
function main(): void {
  try {
    // Wait for DOM to be ready
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

function initializeApplication(): void {
  // Setup error handling
  setupErrorHandling();
  
  // Initialize charts
  initializeCharts();
  
  // Setup timeframe selector
  setupTimeframeSelector();
  
  // Setup cleanup
  setupCleanup();
  
  // Log debug info
  logAggregationInfo();
  
  console.log('Application initialized successfully');
  console.log(`Indicator data points: ${data.length}`);
  console.log(`Default timeframe: ${currentTimeframe}`);
}

// Start the application
main();
