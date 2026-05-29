import { createBrowserRouter, Navigate } from "react-router-dom";
import Dashboard      from "./pages/Dashboard";
import ClientDeepDive from "./pages/ClientDeepDive";
import WrapperDetail  from "./pages/WrapperDetail";
import Import         from "./pages/Import";
import Auth           from "./pages/Auth";

export const router = createBrowserRouter([
  { path: "/",                                          element: <Navigate to="/dashboard" replace /> },
  { path: "/auth",                                      element: <Auth /> },
  { path: "/dashboard",                                 element: <Dashboard /> },
  { path: "/clients/:clientId",                         element: <ClientDeepDive /> },
  { path: "/clients/:clientId/wrappers/:wrapperId",     element: <WrapperDetail /> },
  { path: "/clients",                                   element: <Navigate to="/dashboard" replace /> },
  { path: "/import",                                    element: <Import /> },
]);
