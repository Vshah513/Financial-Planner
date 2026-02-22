/**
 * Centralized financial calculations for the Cash Clarity application.
 * All functions assume expenses are stored as negative numbers (e.g. -196.01) unless otherwise specified.
 */

/**
 * Calculates net cash flow (also known as Net Income).
 * Since expenses are stored as negative numbers, we ADD them to income.
 * Example: $10,000 + (-$2,000) = $8,000
 * 
 * @param income - Total income/revenue (positive number expected)
 * @param expenses - Total expenses (negative number expected)
 * @returns Net cash flow / Net income
 */
export function calculateNetCashFlow(income: number, expenses: number): number {
    return income + expenses;
}

/**
 * Calculates retained earnings after dividends/owner draws.
 * 
 * @param netCashFlow - Net cash flow from operations
 * @param dividends - Dividends released (positive number expected for cash out)
 * @returns Retained earnings
 */
export function calculateRetainedEarnings(netCashFlow: number, dividends: number): number {
    return netCashFlow - dividends;
}

/**
 * Calculates the ending cash balance for a period.
 * 
 * @param openingBalance - Starting cash balance for the period
 * @param netCashFlow - Net cash flow for the period
 * @param dividends - Dividends paid out (positive number expected)
 * @returns Computed closing balance / Ending cash
 */
export function calculateClosingBalance(openingBalance: number, netCashFlow: number, dividends: number): number {
    return openingBalance + netCashFlow - dividends;
}

/**
 * Calculates the savings rate as a percentage (0 to 100+).
 * 
 * @param income - Total income (positive number expected)
 * @param netCashFlow - Net cash flow
 * @returns Savings rate percentage, or 0 if income is 0 or negative
 */
export function calculateSavingsRate(income: number, netCashFlow: number): number {
    if (income <= 0) return 0;
    return (netCashFlow / income) * 100;
}
