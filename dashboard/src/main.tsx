import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {createBrowserRouter , RouterProvider} from "react-router-dom"
import './index.css'
import App from './App.tsx'
import SignUp from './components/SignUp.tsx'
import Login from './components/Login.tsx'
import Dashboard from './components/Dashboard.tsx'
import Home from './components/Home.tsx';
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
    <RouterProvider router = {router} />
  </StrictMode>,
)
