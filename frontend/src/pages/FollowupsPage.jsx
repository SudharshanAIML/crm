import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSessionsByContact, createSession } from '../services/sessionService';
import { getContactById, promoteToMQL, promoteToSQL, convertToOpportunity, closeDeal, convertToEvangelist, moveToDormant } from '../services/contactService';
import { createTask, getTasksByContact } from '../services/taskService';
import { AddSessionModal, TakeActionModal } from '../components/sessions';
import { TaskModal } from '../components/calendar';
import {
  FollowupsHeader,
  SessionsTable,
  ContactSidebar,
  LoadingState,
  ErrorState,
  calculateSessionStats,
  filterSessions,
} from '../components/followups';

/**
 * FollowupsPage - Main page for managing contact follow-ups and sessions
 * 
 * Features:
 * - View and search all sessions with a contact
 * - Log new sessions
 * - View contact profile and statistics
 * - Promote contacts through the sales pipeline
 * - Schedule tasks/appointments
 */
const FollowupsPage = () => {
  const { contactId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  // Dynamic back navigation based on user role
  const backPath = isAdmin ? '/admin/contacts' : '/dashboard';
  const backLabel = isAdmin ? 'Admin Dashboard' : 'Dashboard';
  
  // Core state
  const [contact, setContact] = useState(location.state?.contact || null);
  const [sessions, setSessions] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [upcomingTasks, setUpcomingTasks] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [takeActionData, setTakeActionData] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // Fetch all data on mount
  useEffect(() => {
    if (contactId) {
      fetchData();
    }
  }, [contactId]);

  /**
   * Fetch contact, sessions, and tasks data
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel fetch for better performance
      const [contactData, sessionsData, tasksData] = await Promise.all([
        // Fetch contact if not passed via navigation state
        contact ? Promise.resolve(contact) : getContactById(contactId),
        getSessionsByContact(contactId),
        getTasksByContact(contactId).catch(() => []),
      ]);

      // Set contact
      if (!contact) {
        setContact(contactData);
      }

      // Process sessions
      if (Array.isArray(sessionsData)) {
        setSessions(sessionsData);
        const ratings = sessionsData.filter(s => s.rating).map(s => s.rating);
        const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        setAverageRating(avg);
      } else if (sessionsData && typeof sessionsData === 'object') {
        setSessions(sessionsData.sessions || []);
        const avgRating = Number(sessionsData.averageRating) || 0;
        setAverageRating(isNaN(avgRating) ? 0 : avgRating);
      } else {
        setSessions([]);
        setAverageRating(0);
      }
      
      // Process upcoming tasks
      const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || [];
      const now = new Date();
      const futureTasks = tasks
        .filter(t => new Date(t.due_date || t.scheduled_date) >= now && t.status !== 'COMPLETED')
        .sort((a, b) => new Date(a.due_date || a.scheduled_date) - new Date(b.due_date || b.scheduled_date));
      setUpcomingTasks(futureTasks);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [contactId, contact]);

  /**
   * Handle session creation
   */
  const handleSessionSubmit = useCallback(async (sessionData) => {
    try {
      setSubmitting(true);
      setError(null);
      await createSession(sessionData);
      await fetchData();
      setAddSessionOpen(false);
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err.response?.data?.message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  }, [fetchData]);

  /**
   * Handle contact promotion through pipeline stages
   */
  const handleConfirmPromotion = useCallback(async (contact, targetStatus, additionalData) => {
    try {
      setSubmitting(true);
      setError(null);

      const promotionActions = {
        MQL: () => promoteToMQL(contact.contact_id),
        SQL: () => promoteToSQL(contact.contact_id),
        OPPORTUNITY: () => convertToOpportunity(contact.contact_id, additionalData.value),
        CUSTOMER: () => closeDeal(contact.contact_id, additionalData.value, additionalData.productName),
        EVANGELIST: () => convertToEvangelist(contact.contact_id),
        DORMANT: () => moveToDormant(contact.contact_id),
      };

      const action = promotionActions[targetStatus];
      if (action) {
        await action();
      }

      // Refresh contact data after promotion
      const updatedContact = await getContactById(contactId);
      setContact(updatedContact);
      setTakeActionData(null);
    } catch (err) {
      console.error('Error promoting contact:', err);
      setError(err.response?.data?.message || 'Failed to promote contact');
    } finally {
      setSubmitting(false);
    }
  }, [contactId]);

  /**
   * Handle task/appointment creation
   */
  const handleTaskSave = useCallback(async (taskData) => {
    try {
      await createTask({
        ...taskData,
        contact_id: contact?.contact_id || contactId,
      });
      setTaskModalOpen(false);
      // Refresh to show new task
      fetchData();
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err.response?.data?.message || 'Failed to create appointment');
    }
  }, [contact, contactId, fetchData]);

  // Memoized calculations
  const sessionStats = useMemo(() => calculateSessionStats(sessions), [sessions]);

  const lastContactedAt = useMemo(() => {
    if (sessions.length === 0) return null;
    const sortedSessions = [...sessions].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    return sortedSessions[0]?.created_at;
  }, [sessions]);

  const nextUpcomingTask = useMemo(() => upcomingTasks[0] || null, [upcomingTasks]);

  const filteredSessions = useMemo(
    () => filterSessions(sessions, searchQuery, contact?.status),
    [sessions, searchQuery, contact?.status]
  );

  // Event handlers
  const handleBack = useCallback(() => navigate(backPath), [navigate, backPath]);
  const handleAddSession = useCallback(() => setAddSessionOpen(true), []);
  const handleAddTask = useCallback(() => setTaskModalOpen(true), []);
  const handlePromote = useCallback((nextStage) => {
    setTakeActionData({ contact, targetStatus: nextStage });
  }, [contact]);

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Error state (when contact couldn't be loaded)
  if (error && !contact) {
    return <ErrorState error={error} onBack={handleBack} backLabel={backLabel} />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-gray-50 to-slate-100 flex overflow-hidden">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <FollowupsHeader
          contact={contact}
          sessionsCount={sessions.length}
          averageRating={averageRating}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onBack={handleBack}
          onAddSession={handleAddSession}
          backLabel={backLabel}
        />

        {/* Sessions Table - Scrollable Area */}
        <div className="flex-1 p-0 overflow-hidden flex flex-col min-h-0">
          <SessionsTable
            sessions={filteredSessions}
            contactName={contact?.name}
            contactStatus={contact?.status}
            selectedSession={selectedSession}
            onSelectSession={setSelectedSession}
            onAddSession={handleAddSession}
          />
        </div>
      </div>

      {/* Right Sidebar - Contact Profile */}
      <ContactSidebar
        contact={contact}
        averageRating={averageRating}
        sessionsCount={sessions.length}
        sessionStats={sessionStats}
        lastContactedAt={lastContactedAt}
        nextUpcomingTask={nextUpcomingTask}
        onAddSession={handleAddSession}
        onAddTask={handleAddTask}
        onPromote={handlePromote}
      />

      {/* Modals */}
      <AddSessionModal
        isOpen={addSessionOpen}
        contact={contact}
        onClose={() => setAddSessionOpen(false)}
        onSubmit={handleSessionSubmit}
        loading={submitting}
      />

      <TakeActionModal
        isOpen={!!takeActionData}
        contact={takeActionData?.contact}
        targetStatus={takeActionData?.targetStatus}
        onClose={() => setTakeActionData(null)}
        onConfirm={handleConfirmPromotion}
        loading={submitting}
      />

      <TaskModal
        isOpen={taskModalOpen}
        task={null}
        contacts={contact ? [contact] : []}
        selectedDate={new Date()}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleTaskSave}
        lockedContact={contact}
      />
    </div>
  );
};

export default FollowupsPage;
