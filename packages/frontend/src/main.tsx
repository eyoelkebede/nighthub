import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import App from './App.tsx';
import Homepage from './pages/Homepage.tsx';
import WaitingRoom from './pages/WaitingRoom.tsx';
import './index.css';

// Here we define all the possible pages in our app
const router = createBrowserRouter([
  {
    // The App component will act as the main layout for all pages
    path: '/',
    element: <App />,
    children: [
      {
        // When the path is exactly "/", render the Homepage
        index: true, 
        element: <Homepage />,
      },
      {
        // When the path is "/waiting", render the WaitingRoom
        path: 'waiting',
        element: <WaitingRoom />,
      },
      // We can add more pages like a "/chat" page here later
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);