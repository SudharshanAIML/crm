import { memo } from 'react';
import { GmailView } from '../components/gmail';

/**
 * Gmail page - displays Gmail integration view
 */
const GmailPage = memo(() => {
  return <GmailView />;
});

GmailPage.displayName = 'GmailPage';

export default GmailPage;
