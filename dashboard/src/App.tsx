import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "./store/store";
import { Outlet, useNavigate, useLocation, matchPath } from "react-router-dom";

function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();
  const location = useLocation(); 

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/getCurrentUser`,
          { withCredentials: true }
        );
        setUser(res.data.data);
      } catch (error) {
        console.log("Not logged in.");
        logout();

        const isGuestDashboard = matchPath(
          "/dashboard/:token/:subdomain", 
          location.pathname
        );
        const isPublicPage = ["/login", "/register"].includes(location.pathname);
        if (!isGuestDashboard && !isPublicPage) {
           navigate("/login");
        }

      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [setUser, logout, navigate, location.pathname]);

  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return <Outlet />;
}

export default App;