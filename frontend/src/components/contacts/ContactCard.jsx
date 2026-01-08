import { useState } from 'react';
import { Mail, Star, MessageSquare, Sparkles } from 'lucide-react';

const ContactCard = ({ contact, onSelect, onEmailClick, onFollowupsClick }) => {
  const [imageError, setImageError] = useState(false);

  // Calculate star rating (0-5 based on average_rating 0-10)
  const starRating = contact.average_rating ? Math.round((contact.average_rating / 10) * 5) : 0;

  // Generate initials for avatar fallback
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get temperature border color
  const getTemperatureBorder = () => {
    switch (contact.temperature) {
      case 'HOT':
        return 'border-l-red-500';
      case 'WARM':
        return 'border-l-orange-500';
      case 'COLD':
      default:
        return 'border-l-blue-500';
    }
  };

  /**
   * Get interest level badge based on latest session rating
   * Grey: No sessions (never contacted) - latest_rating is null
   * Red: Low interest (rating 1-4)
   * Yellow: Moderate interest (rating 5-7)
   * Green: High interest (rating 8-10)
   */
  const getInterestBadge = () => {
    // Never contacted - grey badge (null means no sessions)
    if (contact.latest_rating === null || contact.latest_rating === undefined) {
      return {
        label: 'No Contact',
        className: 'bg-gray-100 text-gray-500 border-gray-200',
        icon: null
      };
    }
    
    const rating = parseFloat(contact.latest_rating) || 0;
    
    // High interest (8-10)
    if (rating >= 8) {
      return {
        label: 'Very Interested',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <Sparkles className="w-3 h-3" />
      };
    }
    
    // Moderate interest (5-7)
    if (rating >= 5) {
      return {
        label: 'Moderate',
        className: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: null
      };
    }
    
    // Low interest (1-4)
    return {
      label: 'Low Interest',
      className: 'bg-red-100 text-red-700 border-red-200',
      icon: null
    };
  };

  // Render star rating
  const renderStars = () => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= starRating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  // Format phone number for display
  const formatPhone = (phone) => {
    if (!phone) return '—';
    // Simple formatting - just show the number
    return phone;
  };

  return (
    <div
      className={`bg-white rounded-xl border-l-4 ${getTemperatureBorder()} border border-gray-100 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer group overflow-hidden`}
      onClick={() => onSelect(contact)}
    >
      {/* Card Content */}
      <div className="p-4">
        {/* Top Section - Avatar and Info */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {!imageError && contact.profile_picture ? (
              <img
                src={contact.profile_picture}
                alt={contact.name}
                className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-gray-100">
                {getInitials(contact.name)}
              </div>
            )}
            {/* Online indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
          </div>

          {/* Contact Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-sky-600 transition-colors">
              {contact.name}
            </h3>
            <p className="text-sm text-gray-500 truncate mt-0.5">
              {formatPhone(contact.phone)}
            </p>
            {/* Star Rating & Interest Badge */}
            <div className="mt-2 flex items-center gap-2">
              {renderStars()}
              {(() => {
                const badge = getInterestBadge();
                return (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.className}`}>
                    {badge.icon}
                    {badge.label}
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100 my-4"></div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Mail Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEmailClick(contact);
            }}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50 hover:bg-sky-50 text-gray-500 hover:text-sky-600 transition-all hover:shadow-sm"
            title="Send Email"
            aria-label="Send Email"
          >
            <Mail className="w-5 h-5" />
          </button>

          {/* Followups Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFollowupsClick(contact);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 rounded-lg transition-all shadow-sm hover:shadow-md"
          >
            <MessageSquare className="w-4 h-4" />
            Followups
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactCard;