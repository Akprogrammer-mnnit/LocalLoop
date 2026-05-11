import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/store";

export const ProtectedRoute = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <Outlet />;
};

export const PublicRoute = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};