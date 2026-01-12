import { memo } from 'react';
import CalendarView from '../components/calendar/CalendarView';

/**
 * Calendar page - displays calendar view
 */
const CalendarPage = memo(() => {
  return <CalendarView />;
});

CalendarPage.displayName = 'CalendarPage';

export default CalendarPage;
