import { Outlet } from 'react-router-dom';

function App() {
  // This component now just provides a container,
  // and <Outlet /> renders the current page's component.
  return (
    <div>
      <Outlet />
    </div>
  );
}

export default App;