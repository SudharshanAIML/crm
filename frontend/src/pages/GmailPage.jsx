import { memo } from 'react';
import { useLocation } from 'react-router-dom';
import { EmailView } from '../components/gmail';

/**
 * Gmail page - displays Gmail integration view
 */
const GmailPage = memo(() => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  return <EmailView isAdmin={isAdminRoute} />;
});

GmailPage.displayName = 'GmailPage';

export default GmailPage;
