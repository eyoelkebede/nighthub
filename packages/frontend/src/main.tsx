import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketProvider';
import App from './App.tsx';
import Homepage from './pages/Homepage.tsx';
import WaitingRoom from './pages/WaitingRoom.tsx';
import ChatPage from './pages/ChatPage.tsx';
// 1. Import the new pages
import TermsPage from './pages/TermsPage.tsx';
import PrivacyPage from './pages/PrivacyPage.tsx';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Homepage /> },
      { path: 'waiting', element: <WaitingRoom /> },
      { path: 'chat/:roomId', element: <ChatPage /> },
      // 2. Add the new routes
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <WebSocketProvider>
    <RouterProvider router={router} />
  </WebSocketProvider>
);
