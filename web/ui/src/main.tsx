import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import { getClerkPublishableKey } from "./lib/clerk";
import { ThemeProvider, useTheme } from "./lib/theme";
import "./styles/tokens.css";

const publishableKey = getClerkPublishableKey();

const sharedLayout = {
  socialButtonsPlacement: "top" as const,
  socialButtonsVariant: "blockButton" as const,
  showOptionalFields: false,
};

const darkAppearance = {
  variables: {
    colorPrimary: "#6366f1",
    colorBackground: "#0d0f15",
    colorInputBackground: "#161a23",
    colorText: "#e7eaf2",
    colorTextSecondary: "#a2a9b5",
    colorNeutral: "#ffffff",
    borderRadius: "10px",
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
    fontSize: "14px",
  },
  elements: {
    rootBox: { width: "100%" },
    card: { background: "transparent", boxShadow: "none", border: "none", padding: 0, width: "100%" },
    header: { display: "none" },
    headerTitle: { display: "none" },
    headerSubtitle: { display: "none" },
    logoBox: { display: "none" },
    footer: { background: "transparent", boxShadow: "none", "& + div": { background: "transparent" } },
    footerAction: { color: "#a2a9b5" },
    footerActionLink: { color: "#a5b4fc", fontWeight: 600 },
    socialButtonsBlockButton: {
      border: "1px solid rgba(255,255,255,0.14)",
      background: "#161a23",
      color: "#e7eaf2",
      "&:hover": { background: "#1d2230" },
    },
    socialButtonsBlockButtonText: { fontWeight: 500 },
    dividerLine: { background: "rgba(255,255,255,0.08)" },
    dividerText: { color: "#767e92", fontSize: "11.5px", letterSpacing: "0.6px" },
    formFieldLabel: { color: "#b8bdcb", fontSize: "12.5px", fontWeight: 500 },
    formFieldInput: {
      background: "#161a23",
      border: "1px solid rgba(255,255,255,0.14)",
      color: "#e7eaf2",
      "&:focus": { borderColor: "#6366f1", boxShadow: "0 0 0 3px rgba(99,102,241,0.18)" },
    },
    formButtonPrimary: {
      background: "linear-gradient(135deg, #6366f1, #8b5cf6 60%, #ec4899)",
      boxShadow: "0 6px 16px rgba(99,102,241,0.35)",
      fontWeight: 600,
      textTransform: "none",
      fontSize: "14px",
      "&:hover": { filter: "brightness(1.05)" },
    },
    identityPreviewEditButton: { color: "#a5b4fc" },
    formResendCodeLink: { color: "#a5b4fc" },
    badge: { background: "#161a23", color: "#a2a9b5" },
  },
  layout: sharedLayout,
};

const lightAppearance = {
  variables: {
    colorPrimary: "#4f46e5",
    colorBackground: "#ffffff",
    colorInputBackground: "#f1f5f9",
    colorText: "#0f172a",
    colorTextSecondary: "#475569",
    colorNeutral: "#0f172a",
    borderRadius: "10px",
    fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
    fontSize: "14px",
  },
  elements: {
    rootBox: { width: "100%" },
    card: { background: "transparent", boxShadow: "none", border: "none", padding: 0, width: "100%" },
    header: { display: "none" },
    headerTitle: { display: "none" },
    headerSubtitle: { display: "none" },
    logoBox: { display: "none" },
    footer: { background: "transparent", boxShadow: "none", "& + div": { background: "transparent" } },
    footerAction: { color: "#475569" },
    footerActionLink: { color: "#4f46e5", fontWeight: 600 },
    socialButtonsBlockButton: {
      border: "1px solid rgba(15,23,42,0.14)",
      background: "#ffffff",
      color: "#0f172a",
      "&:hover": { background: "#f1f5f9" },
    },
    socialButtonsBlockButtonText: { fontWeight: 500 },
    dividerLine: { background: "rgba(15,23,42,0.10)" },
    dividerText: { color: "#64748b", fontSize: "11.5px", letterSpacing: "0.6px" },
    formFieldLabel: { color: "#475569", fontSize: "12.5px", fontWeight: 500 },
    formFieldInput: {
      background: "#ffffff",
      border: "1px solid rgba(15,23,42,0.14)",
      color: "#0f172a",
      "&:focus": { borderColor: "#4f46e5", boxShadow: "0 0 0 3px rgba(79,70,229,0.16)" },
    },
    formButtonPrimary: {
      background: "linear-gradient(135deg, #4f46e5, #7c3aed 60%, #db2777)",
      boxShadow: "0 6px 16px rgba(79,70,229,0.30)",
      fontWeight: 600,
      textTransform: "none",
      fontSize: "14px",
      "&:hover": { filter: "brightness(1.03)" },
    },
    identityPreviewEditButton: { color: "#4f46e5" },
    formResendCodeLink: { color: "#4f46e5" },
    badge: { background: "#f1f5f9", color: "#475569" },
  },
  layout: sharedLayout,
};

function ThemedClerkProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const appearance = theme === "light" ? lightAppearance : darkAppearance;
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/"
      afterSignUpUrl="/"
      appearance={appearance}
    >
      {children}
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedClerkProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemedClerkProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
