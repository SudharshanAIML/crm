import DiscussView from '../components/discuss/DiscussView';

/**
 * DiscussPage — Team Chat (Discord-like)
 * Renders inside DashboardLayout via React Router <Outlet>
 */
const DiscussPage = () => {
  return (
    <div className="h-[calc(100vh-4rem)] p-4">
      <DiscussView />
    </div>
  );
};

export default DiscussPage;
