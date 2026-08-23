import { Navigate, Route, Routes } from "react-router-dom";
import { AuthReady, GuestRoute, ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { BillEditorPage } from "./pages/BillEditorPage";
import { BillViewPage } from "./pages/BillViewPage";
import { SharedBillPage } from "./pages/SharedBillPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
