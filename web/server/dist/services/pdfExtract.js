import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { HttpError } from "../middleware/error.js";
export async function extractResumeText(buffer, originalName, mimetype) {
    const ext = originalName.toLowerCase().split(".").pop() || "";
    if (ext === "pdf" || mimetype === "application/pdf") {
        try {
            const parsed = await pdfParse(buffer);
            const text = parsed.text?.trim();
            if (!text || text.length < 30) {
                throw new HttpError(400, "Could not extract meaningful text from PDF (try MD/TXT)");
            }
            return text;
        }
        catch (error) {
            if (error instanceof HttpError)
                throw error;
            const message = error instanceof Error ? error.message : "PDF parsing failed";
            throw new HttpError(400, `PDF parsing failed: ${message}`);
        }
    }
    if (["md", "markdown", "txt", "text"].includes(ext) || mimetype.startsWith("text/")) {
        const text = buffer.toString("utf8").trim();
        if (text.length < 30) {
            throw new HttpError(400, "Uploaded file is too short");
        }
        return text;
    }
    if (ext === "docx" ||
        mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        try {
            const parsed = await mammoth.extractRawText({ buffer });
            const text = parsed.value?.trim();
            if (!text || text.length < 30) {
                throw new HttpError(400, "Could not extract meaningful text from DOCX");
            }
            return text;
        }
        catch (error) {
            if (error instanceof HttpError)
                throw error;
            const message = error instanceof Error ? error.message : "DOCX parsing failed";
            throw new HttpError(400, `DOCX parsing failed: ${message}`);
        }
    }
    throw new HttpError(400, "Unsupported file type. Upload PDF, DOCX, MD, or TXT.");
}
