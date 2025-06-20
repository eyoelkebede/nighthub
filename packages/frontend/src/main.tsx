import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { WebSocketProvider } from './context/WebSocketProvider'; // 1. Import the provider
import App from './App.tsx';
import Homepage from './pages/Homepage.tsx';
import WaitingRoom from './pages/WaitingRoom.tsx';
import ChatPage from './pages/ChatPage.tsx';
import './index.css';

// ... your router definition stays the same ...
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Homepage /> },
      { path: 'waiting', element: <WaitingRoom /> },
      { path: 'chat/:roomId', element: <ChatPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  // 2. Wrap the RouterProvider with our WebSocketProvider
  <WebSocketProvider>
    <RouterProvider router={router} />
  </WebSocketProvider>
);