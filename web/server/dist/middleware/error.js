import { ZodError } from "zod";
export class HttpError extends Error {
    status;
    details;
    constructor(status, message, details) {
        super(message);
        this.status = status;
        this.details = details;
    }
}
export function notFound(_req, res) {
    res.status(404).json({ error: "Route not found" });
}
export function errorHandler(err, _req, res, _next) {
    if (err instanceof ZodError) {
        res.status(400).json({ error: "Validation failed", details: err.flatten() });
        return;
    }
    if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message, details: err.details });
        return;
    }
    if (err instanceof Error) {
        // eslint-disable-next-line no-console
        console.error("[error]", err.message, err.stack);
        res.status(500).json({ error: err.message || "Internal server error" });
        return;
    }
    // eslint-disable-next-line no-console
    console.error("[error]", err);
    res.status(500).json({ error: "Internal server error" });
}
export function requestLogger(req, res, next) {
    const start = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - start;
        // eslint-disable-next-line no-console
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
}
