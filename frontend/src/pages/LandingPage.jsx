import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  Zap, 
  Heart,
  Check,
  X,
  Moon,
  Sun,
  ChevronRight,
  LayoutGrid,
  Play,
  Mail,
  Send,
  Bell,
  User,
  Calendar,
  RefreshCw,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  Target,
  Bot,
  Inbox,
  ArrowRight,
  Menu,
  X as XIcon
} from 'lucide-react';

const LandingPage = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeComparison, setActiveComparison] = useState('Salesforce');
  const [typedText, setTypedText] = useState('');
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [animatedStats, setAnimatedStats] = useState({ leads: 0, conversion: 0, revenue: 0 });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fullText = 'Evangelists';
  const trustedCompanies = ['VELOCITY', 'CLOUDCORE', 'DATALUME', 'SYNERGY', 'ORION'];
  const competitors = ['Salesforce', 'HubSpot', 'Zoho CRM', 'Odoo CRM'];

  // Auto-switch competitor comparison every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveComparison(prev => {
        const currentIndex = competitors.indexOf(prev);
        const nextIndex = (currentIndex + 1) % competitors.length;
        return competitors[nextIndex];
      });
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Typing animation effect
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        setTimeout(() => {
          index = 0;
        }, 2000);
      }
    }, 150);
    return () => clearInterval(timer);
  }, []);

  // Notification animation
  useEffect(() => {
    const timer = setInterval(() => {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Stats counter animation
  useEffect(() => {
    const duration = 2000;
    const steps = 50;
    const targets = { leads: 145, conversion: 32, revenue: 2.4 };
    let step = 0;
    
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setAnimatedStats({
        leads: Math.floor(targets.leads * progress),
        conversion: Math.floor(targets.conversion * progress),
        revenue: (targets.revenue * progress).toFixed(1),
      });
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, []);

  // Email cycling animation
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentEmailIndex(prev => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const sampleEmails = [
    { to: 'sarah@techcorp.io', subject: 'Partnership Opportunity', status: 'sending' },
    { to: 'john@startup.com', subject: 'Follow-up: Product Demo', status: 'sent' },
    { to: 'lisa@enterprise.co', subject: 'Exclusive Offer Inside', status: 'queued' },
  ];

  // Real competitor feature comparison data based on actual platform capabilities
  const features = [
    {
      title: 'AI Outreach Agent (RAG)',
      description: 'Autonomous prospecting using your company\'s unique knowledge base.',
      salesCRM: true,
      competitors: {
        // Salesforce has Einstein GPT but no RAG-based autonomous outreach
        Salesforce: false,
        // HubSpot has AI content assistant but not RAG-based autonomous prospecting
        HubSpot: false,
        // Zoho has Zia AI but limited autonomous outreach capabilities
        'Zoho CRM': false,
        // Odoo has basic AI features but no RAG-based outreach
        'Odoo CRM': false,
      },
    },
    {
      title: 'Auto-Pilot Mode',
      description: 'Full lifecycle automation from lead capture to deal closing without manual entry.',
      salesCRM: true,
      competitors: {
        // Salesforce Flow provides automation but requires significant setup
        Salesforce: true,
        // HubSpot has workflows and sequences for automation
        HubSpot: true,
        // Zoho has Blueprint for process automation
        'Zoho CRM': true,
        // Odoo has automated actions and workflows
        'Odoo CRM': true,
      },
    },
    {
      title: 'Evangelist Identification',
      description: 'Automatically identify and nurture your most loyal customers into advocates.',
      salesCRM: true,
      competitors: {
        // Salesforce doesn't have native evangelist/advocate identification
        Salesforce: false,
        // HubSpot has basic customer health but no evangelist tracking
        HubSpot: false,
        // Zoho lacks dedicated evangelist identification
        'Zoho CRM': false,
        // Odoo doesn't have this feature
        'Odoo CRM': false,
      },
    },
    {
      title: 'Session Rating System',
      description: 'Real-time health scoring after every customer interaction.',
      salesCRM: true,
      competitors: {
        // Salesforce has activity tracking but not session-based rating
        Salesforce: false,
        // HubSpot tracks meetings but no session rating system
        HubSpot: false,
        // Zoho has some interaction scoring via Zia
        'Zoho CRM': true,
        // Odoo lacks real-time session rating
        'Odoo CRM': false,
      },
    },
    {
      title: 'Predictive Churn Analysis',
      description: 'AI-driven early warning system for accounts at risk.',
      salesCRM: true,
      competitors: {
        // Salesforce Einstein has predictive analytics including churn
        Salesforce: true,
        // HubSpot has predictive lead scoring but limited churn prediction
        HubSpot: false,
        // Zoho Zia has churn prediction capabilities
        'Zoho CRM': true,
        // Odoo lacks predictive churn analysis
        'Odoo CRM': false,
      },
    },
    {
      title: 'Multi-Channel RAG Email',
      description: 'AI personalized emails using LinkedIn profile and company data.',
      salesCRM: true,
      competitors: {
        // Salesforce has email but not RAG-based personalization with LinkedIn
        Salesforce: false,
        // HubSpot has AI content but not RAG with external data enrichment
        HubSpot: false,
        // Zoho has email AI but not RAG-based multi-channel
        'Zoho CRM': false,
        // Odoo lacks this capability
        'Odoo CRM': false,
      },
    },
  ];

  const workflowSteps = [
    {
      number: '01',
      title: 'Capture & Engage',
      description: 'Identify high-intent leads automatically. Our AI Outreach Agent initiates conversations across email, LinkedIn, and SMS the moment a lead enters the funnel.',
      icon: <Sparkles className="w-5 h-5 text-sky-500" />,
      color: 'bg-sky-50',
    },
    {
      number: '02',
      title: 'Qualify & Convert',
      description: "Score leads based on real-time behavior. Use 'Auto-Pilot' to move deals through stages with zero manual entry, ensuring no opportunity falls through the cracks.",
      icon: <Zap className="w-5 h-5 text-amber-500" />,
      color: 'bg-amber-50',
    },
    {
      number: '03',
      title: 'Retain & Amplify',
      description: "Track customer satisfaction in real-time. Identify 'Evangelists' and automate referral requests to turn your happy customers into a secondary sales force.",
      icon: <Heart className="w-5 h-5 text-emerald-500" />,
      color: 'bg-emerald-50',
    },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* Navigation */}
      <nav className={`sticky top-0 z-50 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-sm border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-lg flex items-center justify-center shadow-lg shadow-sky-500/25">
                <LayoutGrid className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">SalesCRM</span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className={`text-sm ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                Features
              </a>
              <a href="#workflow" className={`text-sm ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                How it Works
              </a>
              <a href="#comparison" className={`text-sm ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                Comparison
              </a>
              <a href="#pricing" className={`text-sm ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                Pricing
              </a>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link
                to="/login"
                className={`hidden sm:block text-sm font-medium ${isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-sky-500 hover:text-sky-600'} transition-colors`}
              >
                Sign in
              </Link>
              <Link
                to="/login"
                className="hidden sm:block bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-sky-500/25"
              >
                Start Free Trial
              </Link>
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}
              >
                {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className={`md:hidden py-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
              <div className="flex flex-col gap-4">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-sky-500 transition-colors`}>
                  Features
                </a>
                <a href="#workflow" onClick={() => setMobileMenuOpen(false)} className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-sky-500 transition-colors`}>
                  How it Works
                </a>
                <a href="#comparison" onClick={() => setMobileMenuOpen(false)} className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-sky-500 transition-colors`}>
                  Comparison
                </a>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} hover:text-sky-500 transition-colors`}>
                  Pricing
                </a>
                <div className="flex gap-3 pt-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}">
                  <Link to="/login" className="flex-1 text-center text-sm font-medium text-sky-500 py-2 rounded-lg border border-sky-500">
                    Sign in
                  </Link>
                  <Link to="/login" className="flex-1 text-center bg-sky-500 text-white text-sm font-medium py-2 rounded-lg">
                    Start Free Trial
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`relative py-16 md:py-24 overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-b from-sky-50 via-white to-white'}`}>
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-200/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 bg-gradient-to-r from-sky-100 to-orange-100 text-sky-600 text-sm font-medium rounded-full mb-6 border border-sky-200/50">
              ✨ AI-Powered CRM Platform
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Transform Leads into<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-orange-500">
                {typedText}
                <span className="animate-pulse">|</span>
              </span>
            </h1>
            <p className={`text-base md:text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto mb-8`}>
              The first AI-native CRM that automates your entire pipeline. From 
              intelligent outreach to deep client integration, focus on relationships 
              while we handle the data.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white font-medium px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/25 hover:shadow-xl hover:shadow-sky-500/30 inline-flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                className={`w-full sm:w-auto font-medium px-8 py-3.5 rounded-xl border-2 ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'} transition-all inline-flex items-center justify-center gap-2`}
              >
                <Play className="w-4 h-4" />
                Watch Demo
              </button>
            </div>
          </div>

          {/* Live UI Demo */}
          <div className="relative max-w-5xl mx-auto">
            {/* Main Dashboard Preview */}
            <div className={`rounded-2xl shadow-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
              {/* Browser Header */}
              <div className={`flex items-center gap-2 px-4 py-3 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className={`flex-1 mx-4 px-4 py-1.5 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} text-xs text-gray-400 text-center`}>
                  app.salescrm.io/dashboard
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Stats Cards */}
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gradient-to-br from-sky-50 to-sky-100/50'} border ${isDarkMode ? 'border-gray-600' : 'border-sky-200/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>New Leads</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="text-2xl font-bold text-sky-500">+{animatedStats.leads}%</div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>vs last month</div>
                  </div>
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gradient-to-br from-orange-50 to-orange-100/50'} border ${isDarkMode ? 'border-gray-600' : 'border-orange-200/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Conversion</span>
                      <Target className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="text-2xl font-bold text-orange-500">{animatedStats.conversion}%</div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>lead to customer</div>
                  </div>
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gradient-to-br from-emerald-50 to-emerald-100/50'} border ${isDarkMode ? 'border-gray-600' : 'border-emerald-200/50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Revenue</span>
                      <Star className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-2xl font-bold text-emerald-500">${animatedStats.revenue}M</div>
                    <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>this quarter</div>
                  </div>
                </div>

                {/* Email Queue Preview */}
                <div className={`rounded-xl ${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'} p-4`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-sky-500" />
                      <span className="font-medium text-sm">AI Outreach Queue</span>
                    </div>
                    <span className="text-xs text-sky-500 font-medium">Auto-sending...</span>
                  </div>
                  <div className="space-y-2">
                    {sampleEmails.map((email, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all duration-500 ${
                          idx === currentEmailIndex 
                            ? isDarkMode ? 'bg-sky-500/20 border border-sky-500/30' : 'bg-sky-50 border border-sky-200'
                            : isDarkMode ? 'bg-gray-800/50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            idx === currentEmailIndex ? 'bg-sky-500 text-white' : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                          }`}>
                            {idx === currentEmailIndex ? (
                              <Send className="w-4 h-4 animate-pulse" />
                            ) : (
                              <Mail className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <div className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{email.to}</div>
                            <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{email.subject}</div>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          email.status === 'sending' ? 'bg-sky-100 text-sky-600' :
                          email.status === 'sent' ? 'bg-green-100 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {idx === currentEmailIndex ? 'Sending...' : email.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Notification */}
            <div className={`absolute -right-4 top-20 transition-all duration-500 ${showNotification ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
              <div className={`p-4 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} max-w-[200px]`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Bell className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-xs font-medium">New Conversion!</span>
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Lead "TechCorp" converted to customer
                </p>
                <span className="text-xs text-green-500 font-medium">+$12,500</span>
              </div>
            </div>

            {/* Floating Chat Bubble */}
            <div className="absolute -left-4 bottom-20 hidden md:block">
              <div className={`p-4 rounded-xl shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} max-w-[220px]`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-sky-500" />
                  </div>
                  <span className="text-xs font-medium">AI Assistant</span>
                </div>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  "I've drafted 23 personalized emails for your hot leads. Ready to send?"
                </p>
              </div>
            </div>
          </div>

          {/* Trusted By Section */}
          <div className="mt-16 text-center">
            <p className={`text-xs uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-400'} mb-6`}>
              Trusted by hyper-growth teams
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {trustedCompanies.map((company, idx) => (
                <span 
                  key={idx}
                  className={`text-sm font-semibold tracking-wider ${isDarkMode ? 'text-gray-600' : 'text-gray-300'} hover:text-sky-500 transition-colors cursor-default`}
                >
                  {company}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section with Live UI */}
      <section id="features" className={`py-20 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-sky-500 text-sm font-medium uppercase tracking-wide">Features</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">
              Everything you need to grow at scale
            </h2>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
              Our AI agents work around the clock to ensure no lead ever gets cold and every 
              customer feels like a VIP.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* AI Outreach Agent Card */}
            <div className={`group p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} shadow-sm hover:shadow-xl transition-all duration-300`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Outreach Agent</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                Personalized email sequences that adapt based on recipient behavior. High 
                conversion copy crafted for your brand.
              </p>
              {/* Mini UI Demo */}
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-500">Agent Active</span>
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  23 emails drafted • 12 sent today
                </div>
              </div>
            </div>

            {/* Auto-Pilot Mode Card */}
            <div className={`group p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} shadow-sm hover:shadow-xl transition-all duration-300`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Auto-Pilot Mode</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                Let AI handle the repetitive follow-ups and appointment booking. Free up your 
                sales team to focus on closing deals.
              </p>
              {/* Mini UI Demo */}
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Auto-Pilot</span>
                  <div className="w-10 h-5 bg-orange-500 rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-8 flex-1 rounded ${i <= 3 ? 'bg-orange-200' : isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} 
                         style={{height: `${20 + i * 8}px`}} />
                  ))}
                </div>
              </div>
            </div>

            {/* Universal Sync Card */}
            <div className={`group p-6 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} shadow-sm hover:shadow-xl transition-all duration-300`}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Universal Sync</h3>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                Native integration with Slack, Outlook, Notion, and 2,000+ apps. Your data stays 
                unified across every touchpoint.
              </p>
              {/* Mini UI Demo */}
              <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {['bg-purple-500', 'bg-blue-500', 'bg-pink-500', 'bg-yellow-500'].map((color, i) => (
                      <div key={i} className={`w-6 h-6 rounded-full ${color} border-2 ${isDarkMode ? 'border-gray-800' : 'border-white'} flex items-center justify-center`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ))}
                  </div>
                  <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>+2,000 apps</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className={`py-20 ${isDarkMode ? 'bg-gray-800/50' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">A Streamlined Workflow</h2>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Transform your customer journey into an automated growth engine.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 border-t-2 border-dashed border-gray-200" style={{ left: '16%', right: '16%' }} />
            
            {workflowSteps.map((step, index) => (
              <div key={index} className="relative">
                <div className={`${step.color} w-12 h-12 rounded-full flex items-center justify-center mb-6 mx-auto relative z-10`}>
                  {step.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-center">
                  <span className={`${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{step.number}.</span> {step.title}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center`}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Comparison Section */}
      <section id="comparison" className={`py-20 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sky-500 text-sm font-medium uppercase tracking-wide">
              Why Choose SalesCRM
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-4">
              Features that set us <span className="text-sky-500">apart from the rest.</span>
            </h2>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Compare SalesCRM's advanced automation capabilities with traditional CRM platforms.
            </p>
          </div>

          {/* Competitor Tabs with Progress Indicator */}
          <div className="flex justify-center gap-2 mb-10 flex-wrap">
            {competitors.map((competitor) => (
              <button
                key={competitor}
                onClick={() => setActiveComparison(competitor)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden ${
                  activeComparison === competitor
                    ? 'bg-white text-sky-500 shadow-md border-2 border-sky-400 scale-105'
                    : isDarkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {competitor}
                {/* Progress bar for active tab */}
                {activeComparison === competitor && (
                  <div className="absolute bottom-0 left-0 h-0.5 bg-sky-500 animate-progress-bar" />
                )}
              </button>
            ))}
          </div>

          {/* Auto-switching indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Auto-comparing with {activeComparison}</span>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-6 rounded-xl transition-all duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} shadow-sm hover:shadow-lg`}
              >
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
                  {feature.description}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-sky-100 flex items-center justify-center">
                      <Check className="w-3 h-3 text-sky-500" />
                    </div>
                    <span className="text-xs text-sky-500 font-semibold">SALESCRM</span>
                    <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Available</span>
                  </div>
                  <div className={`flex items-center gap-2 transition-all duration-300 ${
                    feature.competitors[activeComparison] ? 'opacity-100' : 'opacity-70'
                  }`}>
                    {feature.competitors[activeComparison] ? (
                      <>
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Check className="w-3 h-3 text-emerald-500" />
                        </div>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} font-medium uppercase`}>
                          {activeComparison.toUpperCase()}
                        </span>
                        <span className={`text-xs text-emerald-500`}>Available</span>
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                          <X className="w-3 h-3 text-gray-400" />
                        </div>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} font-medium uppercase`}>
                          {activeComparison.toUpperCase()}
                        </span>
                        <span className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Not Available</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-12 text-center">
            <div className={`inline-flex items-center gap-4 px-6 py-3 rounded-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center">
                  <Check className="w-3 h-3 text-sky-500" />
                </div>
                <span className="text-sm font-medium">SalesCRM: <span className="text-sky-500">6/6</span></span>
              </div>
              <div className={`w-px h-6 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {activeComparison}: <span className={
                    features.filter(f => f.competitors[activeComparison]).length >= 3 
                      ? 'text-emerald-500' 
                      : 'text-orange-500'
                  }>
                    {features.filter(f => f.competitors[activeComparison]).length}/6
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`py-16 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-2xl ${isDarkMode ? 'bg-gray-900' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-400 rounded-full flex items-center justify-center">
                <span className="text-xl">💡</span>
              </div>
              <div>
                <h3 className="font-semibold">Ready to experience the future?</h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  SalesCRM is designed for SaaS companies looking to automate high-touch relationships.
                </p>
              </div>
            </div>
            <Link
              to="/login"
              className="w-full md:w-auto bg-sky-500 hover:bg-sky-600 text-white font-medium px-6 py-3 rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              Start Your Free Trial
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className={`py-20 ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-b from-sky-50 to-white'}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-6xl mb-8 opacity-20">"</div>
          <blockquote className={`text-xl md:text-2xl font-medium mb-8 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            "SalesCRM didn't just organize our contacts; it redefined our entire sales culture. 
            We saw a <span className="text-sky-500 font-bold">145% increase in lead-to-customer conversion</span> within 
            the first three months of using Auto-Pilot mode."
          </blockquote>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold">
              SC
            </div>
            <div className="text-left">
              <div className="font-semibold text-orange-500">Sarah Chen</div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Head of Revenue, Velocity Global
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 ${isDarkMode ? 'bg-gray-900 border-t border-gray-800' : 'bg-white border-t border-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-sky-600 rounded-lg flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg">SalesCRM</span>
              </div>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                AI-powered CRM for modern sales teams.
              </p>
            </div>

            {/* Product Column */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Product</h4>
              <div className="flex flex-col gap-2">
                <a href="#features" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Features</a>
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Integrations</a>
                <a href="#pricing" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Pricing</a>
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Changelog</a>
              </div>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Company</h4>
              <div className="flex flex-col gap-2">
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>About</a>
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Blog</a>
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Careers</a>
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Contact</a>
              </div>
            </div>

            {/* Legal Column */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Legal</h4>
              <div className="flex flex-col gap-2">
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Privacy Policy</a>
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Terms of Service</a>
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>Cookie Policy</a>
                <a href="#" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-600'} transition-colors`}>GDPR</a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className={`pt-8 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'} flex flex-col sm:flex-row items-center justify-between gap-4`}>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              © 2026 Sales CRM System. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
              <a href="#" className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
              <a href="#" className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition-colors`}>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
