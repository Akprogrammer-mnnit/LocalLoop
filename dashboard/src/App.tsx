import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "./store/store";
import { Outlet } from "react-router-dom";

function App() {
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_SERVER_URL}/api/getCurrentUser`,
          { withCredentials: true }
        );
        console.log(res);

        setUser(res.data.data);
      } catch (error) {
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [setUser, logout]);

  if (loading) return <div>Loading...</div>;

  return (
    <Outlet />
  );
}

export default App;
