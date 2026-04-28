import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

// Google Gemini via AI SDK — free tier from https://aistudio.google.com/app/apikey
// Set GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) in .env.local

export type ModelTier = "fast" | "smart";

// These are only used as hints; we resolve to an actually-available model via ListModels.
const DEFAULT_FAST_HINT = "flash";
const DEFAULT_SMART_HINT = "pro";

let googleProvider: ReturnType<typeof createGoogleGenerativeAI> | null = null;
let resolvedModelNames: Partial<Record<ModelTier, string>> | null = null;

function getApiKey() {
    return (
        process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
        process.env.GEMINI_API_KEY?.trim() ||
        ""
    );
}

function getGoogleProvider() {
    if (googleProvider) return googleProvider;
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
    }
    googleProvider = createGoogleGenerativeAI({ apiKey });
    return googleProvider;
}

type GeminiListModelsResponse = {
    models?: Array<{
        name?: string; // e.g. "models/gemini-1.5-pro"
        supportedGenerationMethods?: string[]; // includes "generateContent"
        displayName?: string;
        description?: string;
    }>;
};

function normalizeModelName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return "";
    // Accept either "gemini-..." or "models/gemini-..."
    return trimmed.startsWith("models/") ? trimmed : `models/${trimmed}`;
}

async function listGenerateContentModels(apiKey: string) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`ListModels failed (${res.status}): ${text || res.statusText}`);
    }
    const json = (await res.json()) as GeminiListModelsResponse;
    const models = (json.models ?? [])
        .map((m) => ({
            name: m.name ?? "",
            methods: m.supportedGenerationMethods ?? [],
        }))
        .filter((m) => m.name && m.methods.includes("generateContent"))
        .map((m) => normalizeModelName(m.name));

    // Dedup while preserving order
    return [...new Set(models)];
}

function pickModel(models: string[], tier: ModelTier) {
    const envOverride =
        tier === "fast"
            ? process.env.GEMINI_MODEL_FAST?.trim()
            : process.env.GEMINI_MODEL_SMART?.trim();
    if (envOverride) {
        const normalized = normalizeModelName(envOverride);
        // If the override isn't in the list, we still try it (so advanced users can force a model),
        // but the resolver will at least tell us what was available.
        return normalized;
    }

    const hint = tier === "fast" ? DEFAULT_FAST_HINT : DEFAULT_SMART_HINT;
    const preferred = models.find((m) => m.toLowerCase().includes(hint));
    return preferred || models[0] || "";
}

async function resolveModelName(tier: ModelTier) {
    if (resolvedModelNames?.[tier]) return resolvedModelNames[tier]!;

    const apiKey = getApiKey();
    if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");

    const models = await listGenerateContentModels(apiKey);
    if (!models.length) {
        throw new Error(
            "No Gemini models available for generateContent for this API key/project. " +
                "Open Google AI Studio → API keys → ensure Gemini API is enabled, then try again."
        );
    }

    const picked = pickModel(models, tier);
    if (!picked) throw new Error("Failed to resolve a Gemini model name.");

    resolvedModelNames = { ...(resolvedModelNames ?? {}), [tier]: picked };
    return picked;
}

export async function getGeminiModel(tier: ModelTier = "smart"): Promise<LanguageModel> {
    const google = getGoogleProvider();
    const modelName = await resolveModelName(tier);
    return google(modelName);
}

export async function getAIModel(tier: ModelTier = "smart"): Promise<LanguageModel> {
    return getGeminiModel(tier);
}

export function aiAvailable() {
    return Boolean(getApiKey());
}
