import DiscussView from '../components/discuss/DiscussView';

/**
 * DiscussPage — Team Chat (Discord-like) with WhatsApp-style audio calls.
 * AudioCallProvider and CallOverlay live at the App level so call state
 * persists across all pages and the floating popup is always visible.
 */
const DiscussPage = () => {
  return (
    <div className="h-full -m-4 lg:-m-6">
      <DiscussView />
    </div>
  );
};

export default DiscussPage;
