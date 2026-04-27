import { Navigate, Route, Routes } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { AppShell } from "./layout/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ResumesPage } from "./pages/ResumesPage";
import { EvaluatePage } from "./pages/EvaluatePage";
import { OptimizePage } from "./pages/OptimizePage";
import { RoadmapPage } from "./pages/RoadmapPage";
import { ScannerPage } from "./pages/ScannerPage";
import { TargetingPage } from "./pages/TargetingPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/resumes" element={<ResumesPage />} />
                <Route path="/evaluate" element={<EvaluatePage />} />
                <Route path="/optimize" element={<OptimizePage />} />
                <Route path="/roadmap" element={<RoadmapPage />} />
                <Route path="/scanner" element={<ScannerPage />} />
                <Route path="/targeting" element={<TargetingPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

// Re-exports for tree-shaking convenience
export { SignedIn, SignedOut };
