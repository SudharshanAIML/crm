import DiscussView from '../components/discuss/DiscussView';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * DiscussPage — Team Chat (Discord-like).
 */
const DiscussPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialIncomingCall = location.state?.incomingCall || null;
  const autoJoinIncoming = Boolean(location.state?.autoJoinIncoming);

  useEffect(() => {
    if (!location.state?.incomingCall && !location.state?.autoJoinIncoming) return;
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="h-full -m-4 lg:-m-6">
      <DiscussView
        initialIncomingCall={initialIncomingCall}
        autoJoinIncoming={autoJoinIncoming}
      />
    </div>
  );
};

export default DiscussPage;
