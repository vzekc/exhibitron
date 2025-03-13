// src/routes.tsx
import { RouteObject } from 'react-router-dom'
import Exhibits from './pages/Exhibits.tsx'
import Exhibit from './pages/Exhibit.tsx'
import Bookmarks from './pages/Bookmarks.tsx'
import TableSearchResult from './components/TableSearchResult.tsx'
import Profile from './pages/user/Profile.tsx'
import Register from './pages/Register.tsx'
import RegistrationList from './pages/admin/RegistrationList.tsx'
import RegistrationDetails from './pages/admin/RegistrationDetails.tsx'
import MainLayout from './components/MainLayout.tsx'
import NotFound from './pages/NotFound.tsx'
import RequestPasswordReset from './pages/RequestPasswordReset.tsx'
import ResetPassword from './pages/ResetPassword.tsx'
import Account from './pages/user/Account.tsx'
import UserExhibits from './pages/user/Exhibits.tsx'
import UserExhibit from './pages/user/ExhibitEditor.tsx'
import PageEditor from './pages/admin/PageEditor.tsx'
import Page from './components/Page.tsx'
import PageList from './pages/admin/PageList.tsx'

const routes: RouteObject[] = [
  { path: '/register', element: <Register /> },
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <Page pageKey="home" /> },
      { path: '/exhibit', element: <Exhibits /> },
      { path: '/exhibit/:id', element: <Exhibit /> },
      { path: '/schedule', element: <Page pageKey="schedule" /> },
      { path: '/bookmarks', element: <Bookmarks /> },
      { path: '/table/:number', element: <TableSearchResult /> },
      { path: '/user/profile', element: <Profile /> },
      { path: '/user/account', element: <Account /> },
      {
        path: '/user/exhibitorInfo',
        element: <Page pageKey="exhibitorInfo" />,
      },
      { path: '/user/exhibit', element: <UserExhibits /> },
      { path: '/user/exhibit/:id', element: <UserExhibit /> },
      { path: '/requestPasswordReset', element: <RequestPasswordReset /> },
      { path: '/resetPassword', element: <ResetPassword /> },
      { path: '/admin/registration', element: <RegistrationList /> },
      { path: '/admin/registration/:id', element: <RegistrationDetails /> },
      { path: '/admin/page/', element: <PageList /> },
      { path: '/admin/page/:key', element: <PageEditor /> },
      { path: '/*', element: <NotFound /> },
    ],
  },
]

export default routes
