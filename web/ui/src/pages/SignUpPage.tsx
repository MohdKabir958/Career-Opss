import { SignUp } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { AuthHero } from "../components/AuthHero";
import { ThemeToggle } from "../components/ThemeToggle";

export function SignUpPage() {
  return (
    <div className="auth-shell">
      <AuthHero />
      <div className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-eyebrow">
            <div>
              <h2 className="title">Create your account</h2>
              <div className="sub">Start optimizing your job search in minutes.</div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <ThemeToggle compact />
              <div className="swap">
                Already a member? <Link to="/sign-in">Sign in</Link>
              </div>
            </div>
          </div>
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" afterSignUpUrl="/" />
        </div>
      </div>
    </div>
  );
}
