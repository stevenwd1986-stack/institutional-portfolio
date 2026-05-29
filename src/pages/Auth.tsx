import { useEffect, useState } from "react";
import { useNavigate }         from "react-router-dom";
import { verifyAdviserToken }  from "../lib/jwt";
import { Loader2, ShieldAlert } from "lucide-react";

export default function Auth() {
  const navigate = useNavigate();
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setError("No access token provided.");
      setLoading(false);
      return;
    }

    verifyAdviserToken(token).then((claims) => {
      if (!claims) {
        setError("Invalid or expired access token. Please return to the adviser platform and try again.");
        setLoading(false);
        return;
      }

      sessionStorage.setItem("adviser", JSON.stringify({
        id:    claims.sub,
        email: claims.email,
        name:  claims.name,
      }));

      navigate("/dashboard", { replace: true });
    });
  }, [navigate]);

  return (
    <div className="h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
        {loading && !error && (
          <>
            <div className="w-10 h-10 rounded-xl bg-[#002147] flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
            <p className="text-sm text-slate-400">Verifying access…</p>
          </>
        )}

        {error && (
          <>
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-sm font-medium text-[#0F172A]">Access denied</p>
            <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
            <a
              href="/"
              className="text-xs text-[#002147] underline decoration-dotted underline-offset-2 hover:text-[#001530]"
            >
              Return to dashboard
            </a>
          </>
        )}
      </div>
    </div>
  );
}
