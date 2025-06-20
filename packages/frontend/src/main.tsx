import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.tsx';
import Homepage from './pages/Homepage.tsx';
import WaitingRoom from './pages/WaitingRoom.tsx';
import ChatPage from './pages/ChatPage.tsx'; // 1. Import the new page
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true, 
        element: <Homepage />,
      },
      {
        path: 'waiting',
        element: <WaitingRoom />,
      },
      {
        // 2. Add the new chat page route
        // The ':roomId' part is a dynamic parameter
        path: 'chat/:roomId',
        element: <ChatPage />,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);