import { useState, FormEvent } from "react";
import { useNavigate }         from "react-router-dom";
import { useLogin }            from "../hooks/useAuth";

export function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = useLogin();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ email, password }, {
      onSuccess: () => navigate("/dashboard", { replace: true }),
    });
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-full max-w-sm">

        {/* Logo / wordmark */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#002147] mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/>
              <rect x="13" y="3" width="8" height="8" rx="1.5" fill="white" opacity="0.5"/>
              <rect x="3" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.5"/>
              <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] tracking-tight">Portfolio Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in with your adviser account</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002147]/20 focus:border-[#002147] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 text-sm border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002147]/20 focus:border-[#002147] transition-colors"
              />
            </div>

            {login.error && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {(login.error as Error).message}
              </p>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-2.5 px-4 bg-[#002147] hover:bg-[#001530] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {login.isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Use the same credentials as your adviser platform account.
        </p>
      </div>
    </div>
  );
}
