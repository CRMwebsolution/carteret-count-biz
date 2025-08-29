import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import Home from './pages/Home'
import Categories from './pages/Categories'
import AddBusiness from './pages/AddBusiness'
import Listing from './pages/Listing'
import Verify from './pages/Verify'
import Account from './pages/Account'
import Admin from './pages/Admin'
import { AuthProvider } from './providers/AuthProvider'   // ⬅️ add this

const router = createBrowserRouter([
  { path: '/', element: <App />, children: [
    { index: true, element: <Home /> },
    { path: 'categories', element: <Categories /> },
    { path: 'add', element: <AddBusiness /> },
    { path: 'verify/:id', element: <Verify /> },
    { path: 'listing/:id', element: <Listing /> },
    { path: 'account', element: <Account /> },
    { path: 'admin', element: <Admin /> },
  ]}
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
)
