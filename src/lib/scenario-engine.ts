/**
 * Scenario Engine - Core projection logic for financial scenarios
 * Used by Life Event Simulator and potentially other tools
 */

// Life event types
export type LifeEventType = "move-house" | "have-baby" | "lose-job" | "buy-car" | "custom";

export interface ScenarioConfig {
    monthlyIncome: number;
    monthlyExpenses: number;
    startingCash: number;
    monthsToProject: number;
    incomeDeltaPct: number;
    expenseDeltaPct: number;
    oneTimeCosts: number;
    debtPayment?: number;
}

export interface MonthlyProjection {
    month: number;
    income: number;
    expenses: number;
    netCashFlow: number;
    cash: number;
}

export interface ScenarioResult {
    monthlyProjections: MonthlyProjection[];
    runwayMonths: number | null;
    worstMonthCash: number;
    breakEvenMonth: number | null;
    finalCash: number;
}

/**
 * Project a financial scenario over multiple months
 */
export function projectScenario(config: ScenarioConfig): ScenarioResult {
    const {
        monthlyIncome,
        monthlyExpenses,
        startingCash,
        monthsToProject,
        incomeDeltaPct,
        expenseDeltaPct,
        oneTimeCosts,
        debtPayment = 0,
    } = config;

    // Calculate adjusted monthly amounts
    const adjustedIncome = monthlyIncome * (1 + incomeDeltaPct / 100);
    const adjustedExpenses = monthlyExpenses * (1 + expenseDeltaPct / 100);

    const projections: MonthlyProjection[] = [];
    let runningCash = startingCash;
    let runwayMonths: number | null = null;
    let worstMonthCash = startingCash;
    let breakEvenMonth: number | null = null;

    for (let month = 0; month < monthsToProject; month++) {
        // Month 0: apply one-time costs
        const oneTimeCost = month === 0 ? oneTimeCosts : 0;

        // Calculate monthly cash flow
        const income = adjustedIncome;
        const expenses = adjustedExpenses + debtPayment + oneTimeCost;
        const netCashFlow = income - expenses;

        // Update running cash
        runningCash += netCashFlow;

        // Track metrics
        if (runningCash < 0 && runwayMonths === null) {
            runwayMonths = month;
        }

        if (runningCash < worstMonthCash) {
            worstMonthCash = runningCash;
        }

        if (runningCash >= startingCash && breakEvenMonth === null && month > 0) {
            breakEvenMonth = month;
        }

        projections.push({
            month,
            income,
            expenses,
            netCashFlow,
            cash: runningCash,
        });
    }

    return {
        monthlyProjections: projections,
        runwayMonths,
        worstMonthCash,
        breakEvenMonth,
        finalCash: runningCash,
    };
}

/**
 * Generate preset scenario variants (conservative, base, aggressive)
 */
export function generateScenarioVariants(
    baseConfig: Omit<ScenarioConfig, "incomeDeltaPct" | "expenseDeltaPct" | "oneTimeCosts" | "debtPayment">,
    eventType: LifeEventType,
    customDeltas?: {
        incomeDeltaPct?: number;
        expenseDeltaPct?: number;
        oneTimeCosts?: number;
        debtPayment?: number;
    }
): Record<"conservative" | "base" | "aggressive", Omit<ScenarioConfig, "monthlyIncome" | "monthlyExpenses" | "startingCash" | "monthsToProject">> {
    // Default deltas by event type
    const eventPresets: Record<
        LifeEventType,
        Record<"conservative" | "base" | "aggressive", { incomeDeltaPct: number; expenseDeltaPct: number; oneTimeCosts: number; debtPayment?: number }>
    > = {
        "move-house": {
            conservative: { incomeDeltaPct: 0, expenseDeltaPct: 20, oneTimeCosts: 5000 },
            base: { incomeDeltaPct: 0, expenseDeltaPct: 15, oneTimeCosts: 3000 },
            aggressive: { incomeDeltaPct: 0, expenseDeltaPct: 10, oneTimeCosts: 2000 },
        },
        "have-baby": {
            conservative: { incomeDeltaPct: -20, expenseDeltaPct: 30, oneTimeCosts: 8000 },
            base: { incomeDeltaPct: -10, expenseDeltaPct: 25, oneTimeCosts: 5000 },
            aggressive: { incomeDeltaPct: 0, expenseDeltaPct: 20, oneTimeCosts: 3000 },
        },
        "lose-job": {
            conservative: { incomeDeltaPct: -100, expenseDeltaPct: 5, oneTimeCosts: 0 },
            base: { incomeDeltaPct: -100, expenseDeltaPct: 0, oneTimeCosts: 0 },
            aggressive: { incomeDeltaPct: -50, expenseDeltaPct: -10, oneTimeCosts: 0 },
        },
        "buy-car": {
            conservative: { incomeDeltaPct: 0, expenseDeltaPct: 15, oneTimeCosts: 8000, debtPayment: 500 },
            base: { incomeDeltaPct: 0, expenseDeltaPct: 10, oneTimeCosts: 5000, debtPayment: 400 },
            aggressive: { incomeDeltaPct: 0, expenseDeltaPct: 8, oneTimeCosts: 3000, debtPayment: 300 },
        },
        custom: {
            conservative: { incomeDeltaPct: 0, expenseDeltaPct: 0, oneTimeCosts: 0, ...customDeltas },
            base: { incomeDeltaPct: 0, expenseDeltaPct: 0, oneTimeCosts: 0, ...customDeltas },
            aggressive: { incomeDeltaPct: 0, expenseDeltaPct: 0, oneTimeCosts: 0, ...customDeltas },
        },
    };

    const presets = eventPresets[eventType];

    return {
        conservative: presets.conservative,
        base: presets.base,
        aggressive: presets.aggressive,
    };
}

/**
 * Calculate runway in months from current cash and burn rate
 */
export function calculateRunway(cash: number, monthlyBurn: number): number | null {
    if (monthlyBurn <= 0) return null; // No burn or positive cash flow
    return cash / monthlyBurn;
}

/**
 * Format month number to readable label (e.g., "Month 3" or "Mar 2026")
 */
export function formatMonthLabel(
    monthIndex: number,
    startDate?: Date,
    format: "relative" | "absolute" = "relative"
): string {
    if (format === "relative") {
        return `Month ${monthIndex}`;
    }

    if (!startDate) {
        return `Month ${monthIndex}`;
    }

    const targetDate = new Date(startDate);
    targetDate.setMonth(targetDate.getMonth() + monthIndex);

    return targetDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
