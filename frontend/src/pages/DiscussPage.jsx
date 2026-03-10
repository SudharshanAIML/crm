import DiscussView from '../components/discuss/DiscussView';

/**
 * DiscussPage — Team Chat (Discord-like) with WhatsApp-style audio calls.
 * AudioCallProvider and CallOverlay are at the App level so calls persist across pages.
 */
const DiscussPage = () => {
  return (
    <div className="h-full -m-4 lg:-m-6">
      <DiscussView />
    </div>
  );
};

export default DiscussPage;
