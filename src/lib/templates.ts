// ============================================================
// Mode templates for Business and Personal workspaces
// Used by the UI to display template previews
// Actual seeding happens via SQL functions
// ============================================================

export type TemplateMode = "business" | "personal";

export interface TemplateGroup {
    name: string;
    type: "income" | "expense";
    categories: string[];
}

export interface ModeTemplate {
    mode: TemplateMode;
    label: string;
    description: string;
    icon: string;
    groups: TemplateGroup[];
}

export const BUSINESS_TEMPLATE: ModeTemplate = {
    mode: "business",
    label: "Business",
    description: "For freelancers, agencies, and small businesses. Tracks revenue, COGS, payroll, software, fees, marketing, G&A, and taxes.",
    icon: "Building2",
    groups: [
        { name: "Revenue", type: "income", categories: ["Sales / Revenue", "Other Income"] },
        { name: "COGS", type: "expense", categories: ["Cost of Goods"] },
        { name: "Payroll", type: "expense", categories: ["Salaries", "Contractors"] },
        { name: "Software", type: "expense", categories: ["SaaS Subscriptions", "Hosting"] },
        { name: "Fees", type: "expense", categories: ["Merchant Fees", "Bank Fees"] },
        { name: "Marketing", type: "expense", categories: ["Ads", "Content"] },
        { name: "G&A", type: "expense", categories: ["Rent", "Utilities", "Legal", "Accounting"] },
        { name: "Taxes", type: "expense", categories: ["Estimated Taxes", "VAT / GST"] },
        { name: "Other", type: "expense", categories: ["Miscellaneous"] },
    ],
};

export const PERSONAL_TEMPLATE: ModeTemplate = {
    mode: "personal",
    label: "Personal",
    description: "For personal budgeting. Tracks salary, housing, transport, food, bills, debt, health, lifestyle, and savings.",
    icon: "User",
    groups: [
        { name: "Income", type: "income", categories: ["Salary", "Freelance", "Other Income"] },
        { name: "Housing", type: "expense", categories: ["Rent / Mortgage", "Utilities"] },
        { name: "Transport", type: "expense", categories: ["Fuel", "Public Transit", "Ride-share"] },
        { name: "Food", type: "expense", categories: ["Groceries", "Dining Out"] },
        { name: "Bills & Subscriptions", type: "expense", categories: ["Phone", "Internet", "Subscriptions"] },
        { name: "Debt", type: "expense", categories: ["Credit Card", "Loans"] },
        { name: "Health", type: "expense", categories: ["Insurance", "Medical"] },
        { name: "Lifestyle", type: "expense", categories: ["Entertainment", "Shopping"] },
        { name: "Savings & Investing", type: "expense", categories: ["Emergency Fund", "Investments"] },
    ],
};

export const TEMPLATES: Record<TemplateMode, ModeTemplate> = {
    business: BUSINESS_TEMPLATE,
    personal: PERSONAL_TEMPLATE,
};
