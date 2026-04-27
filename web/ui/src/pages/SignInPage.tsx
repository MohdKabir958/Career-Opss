import { SignIn } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { AuthHero } from "../components/AuthHero";
import { ThemeToggle } from "../components/ThemeToggle";

export function SignInPage() {
  return (
    <div className="auth-shell">
      <AuthHero />
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-eyebrow">
            <div>
              <h2 className="title">Welcome back</h2>
              <div className="sub">Sign in to your Career-Ops workspace.</div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <ThemeToggle compact />
              <div className="swap">
                New here? <Link to="/sign-up">Sign up</Link>
              </div>
            </div>
          </div>
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" afterSignInUrl="/" />
        </div>
      </div>
    </div>
  );
}
