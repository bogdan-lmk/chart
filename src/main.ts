//TIP With Search Everywhere, you can find any action, file, or symbol in your project. Press <shortcut actionId="Shift"/> <shortcut actionId="Shift"/>, type in <b>terminal</b>, and press <shortcut actionId="EditorEnter"/>. Then run <shortcut raw="npm run dev"/> in the terminal and click the link in its output to open the app in the browser.
import { setupChart } from './chart';
import { data } from './dataService';

// Use Unix timestamps directly for the chart
const chartData = data.map(point => ({
  time: point.time, // Use Unix timestamp directly
  values: point.value,
  total: point.total
}));

// Initialize the chart with data from dataService
setupChart(chartData);
