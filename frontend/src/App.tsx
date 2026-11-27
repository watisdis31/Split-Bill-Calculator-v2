import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AuthReady, GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { Loading } from "./components/Loading";
import { HomePage } from "./pages/HomePage";
import { HowItWorksPage } from "./pages/HowItWorksPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { NotFoundPage } from "./pages/NotFoundPage";

const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((mod) => ({ default: mod.LoginPage }))
);
const RegisterPage = lazy(() =>
  import("./pages/RegisterPage").then((mod) => ({ default: mod.RegisterPage }))
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((mod) => ({ default: mod.DashboardPage }))
);
const BillEditorPage = lazy(() =>
  import("./pages/BillEditorPage").then((mod) => ({ default: mod.BillEditorPage }))
);
const BillViewPage = lazy(() =>
  import("./pages/BillViewPage").then((mod) => ({ default: mod.BillViewPage }))
);
const SharedBillPage = lazy(() =>
  import("./pages/SharedBillPage").then((mod) => ({ default: mod.SharedBillPage }))
);

function RouteFallback() {
  return (
    <div className="shell">
      <Loading message="Loading..." />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterPage />
            </GuestRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <AuthReady>
              <DashboardPage />
            </AuthReady>
          }
        />
        <Route
          path="/bills/new"
          element={
            <AuthReady>
              <BillEditorPage />
            </AuthReady>
          }
        />
        <Route
          path="/bills/:billId"
          element={
            <ProtectedRoute>
              <BillViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bills/:billId/edit"
          element={
            <ProtectedRoute>
              <BillEditorPage />
            </ProtectedRoute>
          }
        />
        <Route path="/bill/s/:shareToken" element={<SharedBillPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}