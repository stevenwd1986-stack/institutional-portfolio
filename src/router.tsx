import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { useSession }       from "./hooks/useAuth";
import Dashboard            from "./pages/Dashboard";
import Clients              from "./pages/Clients";
import ClientDeepDive       from "./pages/ClientDeepDive";
import WrapperDetail        from "./pages/WrapperDetail";
import Import               from "./pages/Import";
import Portfolios           from "./pages/Portfolios";
import Reporting            from "./pages/Reporting";
import Analytics            from "./pages/Analytics";
import CostsAndCharges      from "./pages/CostsAndCharges";
import Auth                 from "./pages/Auth";
import { Login }            from "./pages/Login";

// Redirects unauthenticated users to /login; lets authenticated users through.
function AuthGuard() {
  const { data: session, isLoading } = useSession();
  if (isLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: "/auth",  element: <Auth /> },
  { path: "/login", element: <Login /> },

  // Protected routes
  {
    element: <AuthGuard />,
    children: [
      { path: "/",                                        element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard",                               element: <Dashboard /> },
      { path: "/clients",                                 element: <Clients /> },
      { path: "/clients/:clientId",                       element: <ClientDeepDive /> },
      { path: "/clients/:clientId/wrappers/:wrapperId",   element: <WrapperDetail /> },
      { path: "/portfolios",                              element: <Portfolios /> },
      { path: "/reporting",                               element: <Reporting /> },
      { path: "/analytics",                               element: <Analytics /> },
      { path: "/costs-and-charges",                       element: <CostsAndCharges /> },
      { path: "/import",                                  element: <Import /> },
    ],
  },
]);
