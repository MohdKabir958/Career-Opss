import { env, hasOpenAIKey } from "../env.js";
import { HttpError } from "../middleware/error.js";
export async function chatComplete(opts) {
    if (!hasOpenAIKey()) {
        throw new HttpError(503, "OPENAI_API_KEY is not configured. Set it in web/server/.env to enable AI features.");
    }
    const model = opts.model || env.OPENAI_MODEL || "gpt-4o-mini";
    const body = {
        model,
        messages: [
            { role: "system", content: opts.systemPrompt },
            { role: "user", content: opts.userPrompt },
        ],
        temperature: opts.temperature ?? 0.4,
    };
    if (opts.responseFormat === "json_object") {
        body.response_format = { type: "json_object" };
    }
    if (opts.maxTokens) {
        body.max_tokens = opts.maxTokens;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        const data = (await response.json());
        if (!response.ok) {
            const message = data?.error?.message || `OpenAI request failed (${response.status})`;
            throw new HttpError(response.status === 401 ? 401 : 502, message);
        }
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (!text) {
            throw new HttpError(502, "OpenAI returned an empty response");
        }
        return text;
    }
    catch (error) {
        if (error instanceof HttpError)
            throw error;
        if (error instanceof Error && error.name === "AbortError") {
            throw new HttpError(504, "OpenAI request timed out");
        }
        const message = error instanceof Error ? error.message : "Unknown OpenAI error";
        throw new HttpError(502, message);
    }
    finally {
        clearTimeout(timeout);
    }
}
export function safeJsonParse(text) {
    const cleaned = text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
    try {
        return JSON.parse(cleaned);
    }
    catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (!match)
            return null;
        try {
            return JSON.parse(match[0]);
        }
        catch {
            return null;
        }
    }
}
