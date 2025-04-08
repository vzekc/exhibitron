// src/routes.tsx
import { RouteObject } from 'react-router-dom'
import Exhibits from './pages/Exhibits.tsx'
import Exhibit from './pages/Exhibit.tsx'
import Bookmarks from './pages/Bookmarks.tsx'
import Table from './pages/Table.tsx'
import Profile from './pages/user/Profile.tsx'
import Register from './pages/Register.tsx'
import Login from './pages/Login.tsx'
import RegistrationList from './pages/admin/RegistrationList.tsx'
import RegistrationDetails from './pages/admin/RegistrationDetails.tsx'
import TableLabels from './pages/admin/TableLabels.tsx'
import MainLayout from '@components/MainLayout.tsx'
import NotFound from './pages/NotFound.tsx'
import RequestPasswordReset from './pages/RequestPasswordReset.tsx'
import ResetPassword from './pages/ResetPassword.tsx'
import Account from './pages/user/Account.tsx'
import UserExhibits from './pages/user/Exhibits.tsx'
import ExhibitEditor from './pages/user/ExhibitEditor.tsx'
import PageEditor from './pages/admin/PageEditor.tsx'
import Page from '@components/Page.tsx'
import PageList from './pages/admin/PageList.tsx'
import Exhibitors from './pages/Exhibitors.tsx'
import Exhibitor from './pages/Exibitor.tsx'
import Tables from './pages/Tables.tsx'
import SetupExhibitor from './pages/SetupExhibitor.tsx'
import ProtectedRoute from '@components/ProtectedRoute.tsx'
import AdminProtectedRoute from '@components/AdminProtectedRoute.tsx'
import { ExhibitorProvider } from '@contexts/ExhibitorProvider.tsx'
import SessionEditorPage from './pages/admin/SessionEditorPage.tsx'
import Schedule from './pages/Schedule.tsx'
import Session from './pages/Session.tsx'
import PresenterSessionEditorPage from './pages/PresenterSessionEditorPage.tsx'

const routes: RouteObject[] = [
  { path: '/register', element: <Register /> },
  {
    path: '/login',
    element: (
      <ExhibitorProvider>
        {' '}
        <Login />{' '}
      </ExhibitorProvider>
    ),
  },
  {
    element: <MainLayout />,
    children: [
      { path: '/', element: <Page pageKey="home" /> },
      { path: '/exhibit', element: <Exhibits /> },
      { path: '/exhibit/:id', element: <Exhibit /> },
      { path: '/exhibitor', element: <Exhibitors /> },
      { path: '/exhibitor/:id', element: <Exhibitor /> },
      { path: '/schedule', element: <Schedule /> },
      { path: '/session/:id', element: <Session /> },
      { path: '/session/:id/edit', element: <PresenterSessionEditorPage /> },
      { path: '/bookmarks', element: <Bookmarks /> },
      { path: '/table/:number', element: <Table /> },
      // Protected user routes
      {
        path: '/user',
        element: <ProtectedRoute />,
        children: [
          { path: 'profile', element: <Profile /> },
          { path: 'account', element: <Account /> },
          { path: 'exhibitorInfo', element: <Page pageKey="exhibitorInfo" /> },
          { path: 'exhibit', element: <UserExhibits /> },
          { path: 'exhibit/:id', element: <ExhibitEditor /> },
          { path: 'help', element: <Page pageKey="help" /> },
        ],
      },
      { path: '/requestPasswordReset', element: <RequestPasswordReset /> },
      { path: '/resetPassword', element: <ResetPassword /> },
      // Protected admin routes
      {
        path: '/admin',
        element: <AdminProtectedRoute />,
        children: [
          { path: 'registration', element: <RegistrationList /> },
          { path: 'registration/:id', element: <RegistrationDetails /> },
          { path: 'page', element: <PageList /> },
          { path: 'page/:key', element: <PageEditor /> },
          { path: 'tableLabels', element: <TableLabels /> },
          { path: 'session/new', element: <SessionEditorPage /> },
          { path: 'session/:id', element: <SessionEditorPage /> },
        ],
      },
      { path: '/table', element: <Tables /> },
      { path: '/setupExhibitor', element: <SetupExhibitor /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]

export default routes
