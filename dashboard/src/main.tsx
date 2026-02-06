import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import './index.css'
import App from './App.tsx'
import SignUp from './components/SignUp.tsx'
import Login from './components/Login.tsx'
import Dashboard from './components/Dashboard.tsx'
import Home from './components/Home.tsx';
import axios from 'axios'
import { useAuthStore } from './store/store.ts'
axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL;

axios.interceptors.response.use(
  (response) => {

    return response;
  },
  async (error) => {
    const originalRequest = error.config;


    if (error.response?.status === 401 && !originalRequest._retry) {


      originalRequest._retry = true;

      try {

        await axios.post('/api/refresh-token');


        return axios(originalRequest);

      } catch (refreshError) {

        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: "/",
        element: <Home />
      },
      {
        path: "/dashboard/:SUBDOMAIN",
        element: <Dashboard />
      },
      {
        path: "/dashboard/:token/:SUBDOMAIN",
        element: <Dashboard />
      },
      {
        path: "/login",
        element: <Login />
      },
      {
        path: "/register",
        element: <SignUp />
      }
    ]
  }
])


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
