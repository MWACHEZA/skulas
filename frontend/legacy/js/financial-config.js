/**
 * Financial Configuration & Multi-Currency Support
 * Centralized exchange rates and conversion utilities
 */

const FinancialConfig = {
    // Primary currency is USD
    DEFAULT_CURRENCY: 'USD',

    // Official Bank Rates (Example rates, should be updated via admin)
    // Rates are: 1 USD = X Currency
    // Official Bank Rates
    // Rates are: 1 USD = X Currency
    EXCHANGE_RATES: getTenantData('officialExchangeRates', 'null') || {
        'USD': 1.0,
        'ZiG': 25.5,
        'ZAR': 18.8
    },

    CURRENCY_SYMBOLS: {
        'USD': '$',
        'ZiG': 'ZiG',
        'ZAR': 'R'
    },

    /**
     * Initialize rates and history
     */
    init: function () {
        if (getTenantData('officialExchangeRates', 'null') === null) {
            this.saveDailyRates(this.EXCHANGE_RATES);
        }
    },

    /**
     * Save daily rates and archive them in history
     */
    saveDailyRates: function (rates) {
        this.EXCHANGE_RATES = { ...rates, 'USD': 1.0 };
        saveTenantData('officialExchangeRates', this.EXCHANGE_RATES);

        // Save to history
        const today = new Date().toISOString().split('T')[0];
        const history = getTenantData('exchangeRateHistory', '{}');
        history[today] = { ...this.EXCHANGE_RATES };
        saveTenantData('exchangeRateHistory', history);

        console.log('FinancialConfig: Rates updated for', today);
    },

    /**
     * Convert an amount from one currency to another using historical or current rates
     */
    convert: function (amount, fromCurrency, toCurrency, date = null) {
        if (fromCurrency === toCurrency) return amount;

        const rates = date ? this.getRatesForDate(date) : this.EXCHANGE_RATES;

        // Convert from source to USD first
        const amountInUSD = amount / (rates[fromCurrency] || 1);

        // Convert from USD to target
        return amountInUSD * (rates[toCurrency] || 1);
    },

    /**
     * Get rates for a specific date or fall back to current
     */
    getRatesForDate: function (date) {
        const dateKey = date.includes('T') ? date.split('T')[0] : date;
        const history = getTenantData('exchangeRateHistory', '{}');
        return history[dateKey] || this.EXCHANGE_RATES;
    },

    /**
     * Format currency for display
     */
    format: function (amount, currency) {
        const symbol = this.CURRENCY_SYMBOLS[currency] || currency;
        const formatted = parseFloat(amount).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });

        if (currency === 'USD') return `${symbol}${formatted}`;
        if (currency === 'ZAR') return `${symbol}${formatted}`;
        return `${formatted} ${symbol}`;
    },

    /**
     * Get the USD equivalent of any amount for balance tracking
     */
    getUSDEquivalent: function (amount, currency, date = null) {
        const rates = date ? this.getRatesForDate(date) : this.EXCHANGE_RATES;
        return amount / (rates[currency] || 1);
    }
};

// Initialize
FinancialConfig.init();

window.FinancialConfig = FinancialConfig;

