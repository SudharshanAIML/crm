import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { CONTACT_STATUS } from '../../utils/constants';

const AppLayout = ({ children }) => {
  const [activeStage, setActiveStage] = useState(CONTACT_STATUS.LEAD);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Mock contact counts - will be replaced with real data from API
  const [contactCounts] = useState({
    [CONTACT_STATUS.LEAD]: 12,
    [CONTACT_STATUS.MQL]: 8,
    [CONTACT_STATUS.SQL]: 5,
    [CONTACT_STATUS.OPPORTUNITY]: 3,
    [CONTACT_STATUS.CUSTOMER]: 15,
    [CONTACT_STATUS.EVANGELIST]: 4,
    [CONTACT_STATUS.DORMANT]: 2,
  });

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleStageChange = (stage) => {
    setActiveStage(stage);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
    console.log('Stage changed to:', stage);
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  // Calculate sidebar width for main content margin
  const sidebarWidth = isMobile ? 0 : (sidebarCollapsed ? 64 : 256);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50">
      {/* Fixed Header - Always at top */}
      <Header onMenuToggle={toggleSidebar} showMenuButton={isMobile} />
      
      {/* Mobile Overlay */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed top-16 h-[calc(100vh-4rem)] z-40 transition-all duration-300 ease-in-out ${
          isMobile 
            ? mobileMenuOpen ? 'left-0' : '-left-64'
            : 'left-0'
        }`}
        style={{ width: isMobile ? 256 : (sidebarCollapsed ? 64 : 256) }}
      >
        <Sidebar 
          activeStage={activeStage}
          onStageChange={handleStageChange}
          contactCounts={contactCounts}
          collapsed={isMobile ? false : sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </div>
      
      {/* Main Content - Adjusts based on sidebar state */}
      <main 
        className="min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarWidth, paddingTop: '4rem' }}
      >
        <div className="p-4 md:p-6">
          {typeof children === 'function' 
            ? children({ activeStage, contactCounts, sidebarCollapsed }) 
            : children
          }
        </div>
      </main>
    </div>
  );
};

export default AppLayout;