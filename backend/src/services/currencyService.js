import axios from 'axios';

// Cache for exchange rates (refresh every hour)
let cachedRates = null;
let lastFetchTime = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export const getExchangeRate = async (fromCurrency = 'USD', toCurrency = 'INR') => {
  try {
    // Check if cache is valid
    const now = Date.now();
    if (cachedRates && lastFetchTime && (now - lastFetchTime) < CACHE_DURATION) {
      return calculateRate(fromCurrency, toCurrency, cachedRates);
    }

    // Fetch new rates
    const response = await axios.get(process.env.CURRENCY_API_URL || 'https://api.exchangerate-api.com/v4/latest/USD');
    cachedRates = response.data.rates;
    lastFetchTime = now;

    return calculateRate(fromCurrency, toCurrency, cachedRates);
  } catch (error) {
    console.error('Error fetching exchange rate:', error.message);
    // Return default rate if API fails
    return getDefaultRate(fromCurrency, toCurrency);
  }
};

const calculateRate = (fromCurrency, toCurrency, rates) => {
  if (fromCurrency === toCurrency) return 1;

  // If base is USD
  if (fromCurrency === 'USD') {
    return rates[toCurrency] || 83.50;
  }

  // Convert from any currency to INR
  const usdToFrom = rates[fromCurrency] || 1;
  const usdToTo = rates[toCurrency] || 83.50;
  return usdToTo / usdToFrom;
};

const getDefaultRate = (fromCurrency, toCurrency) => {
  const defaultRates = {
    'USD-INR': 83.50,
    'EUR-INR': 90.00,
    'GBP-INR': 105.00,
    'AUD-INR': 55.00,
    'CAD-INR': 62.00,
    'INR-INR': 1,
  };

  const key = `${fromCurrency}-${toCurrency}`;
  return defaultRates[key] || 83.50;
};

export const convertToINR = async (amount, currency) => {
  const rate = await getExchangeRate(currency, 'INR');
  return {
    rate,
    amountInINR: amount * rate,
  };
};

export default {
  getExchangeRate,
  convertToINR,
};
