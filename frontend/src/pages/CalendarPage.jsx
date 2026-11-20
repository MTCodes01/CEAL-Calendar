import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Calendar from '../components/Calendar';
import { useTheme } from '../context/ThemeContext';
import EventModal from '../components/EventModal';
import ClubFilterSidebar from '../components/ClubFilterSidebar';
import Navbar from '../components/Navbar';
import api from '../api/client';
import { exportToPDF } from '../api/pdfExportService';

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, isAuthenticated, isGuest } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const calendarRef = useRef(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && !isGuest) {
      navigate('/login');
    } else {
      loadClubs();
    }
  }, [isAuthenticated, isGuest]);

  useEffect(() => {
    if (isAuthenticated || isGuest) {
      loadEvents();
    }
  }, [selectedClubs, isAuthenticated, isGuest]);

  const loadClubs = async () => {
    try {
      const response = await api.get('/api/clubs/');
      const data = response.data;
      const clubsArray = Array.isArray(data) ? data : (data.results || []);
      const finalClubs = Array.isArray(clubsArray) ? clubsArray : [];
      setClubs(finalClubs);
      // Select all clubs and their sub-clubs by default
      const allIds = [];
      finalClubs.forEach(c => {
        allIds.push(c.id);
        if (c.sub_clubs) {
          c.sub_clubs.forEach(sub => allIds.push(sub.id));
        }
      });
      setSelectedClubs(allIds);
    } catch (error) {
      console.error('Failed to load clubs:', error);
    }
  };

  const loadEvents = async (start, end) => {
    try {
      setLoading(true);

      // If clubs are loaded but none are selected (e.g., "None" filter), show no events
      if (clubs.length > 0 && selectedClubs.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const params = {};
      
      if (start && end) {
        params.start = start.toISOString();
        params.end = end.toISOString();
      }
      
      const allIdsCount = clubs.reduce((acc, c) => acc + 1 + (c.sub_clubs?.length || 0), 0);
      if (selectedClubs.length > 0 && selectedClubs.length < allIdsCount) {
        params.clubs = selectedClubs.join(',');
      }

      const response = await api.get('/api/events/', { params });
      const data = response.data;
      const eventsArray = Array.isArray(data) ? data : (data.results || []);
      
      const processedEvents = (Array.isArray(eventsArray) ? eventsArray : []).map(event => {
        // Check if user has permission to edit this event (mirrors canEditEvent logic)
        const eventClub = event.club;
        const extraClubIds = user?.extra_clubs?.map(c => c.id) || [];
        const isEditable = user && eventClub && (
          user.is_superuser ||
          (user.sub_club && eventClub.id === user.sub_club.id) ||
          (!user.sub_club && user.club && (
            eventClub.id === user.club.id ||
            (eventClub.parent === user.club.id || eventClub.parent?.id === user.club.id)
          )) ||
          extraClubIds.includes(eventClub.id)
        );
        
        return {
          ...event,
          editable: isEditable,
          startEditable: isEditable,
          durationEditable: isEditable,
          resourceEditable: isEditable,
        };
      });

      setEvents(processedEvents);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDateSelect = (start, end) => {
    const hasClubRole = user?.club || user?.sub_club || (user?.extra_clubs?.length > 0);
    if (hasClubRole) {
      setSelectedEvent({ start, end });
      setShowEventModal(true);
    }
  };

  const handleEventSaved = () => {
    loadEvents();
    setShowEventModal(false);
    setSelectedEvent(null);
    if (calendarRef.current) {
      calendarRef.current.getApi().unselect();
    }
  };

  const handleEventDeleted = () => {
    loadEvents();
    setShowEventModal(false);
    setSelectedEvent(null);
    if (calendarRef.current) {
      calendarRef.current.getApi().unselect();
    }
  };

  const handleEventDrop = async (info) => {
    const { event, oldEvent, revert, view } = info;
    
    // Check permission
    if (!canEditEvent(event)) {
      revert();
      return;
    }

    let start = event.start;
    let end = event.end;

    // Preserve time when dragging in Month View
    if (view.type === 'dayGridMonth' && oldEvent.start) {
      const newDate = new Date(start);
      const oldDate = new Date(oldEvent.start);
      
      newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
      start = newDate;

      if (oldEvent.end) {
        const duration = oldEvent.end.getTime() - oldEvent.start.getTime();
        end = new Date(start.getTime() + duration);
      } else {
        end = null;
      }
    }

    // Optimistically update local state immediately
    const optimisticStart = start.toISOString();
    const optimisticEnd = end ? end.toISOString() : null;
    
    setEvents(prev => prev.map(e => 
      e.id == event.id // Use loose equality
        ? { ...e, start: optimisticStart, end: optimisticEnd } 
        : e
    ));

    try {
      const response = await api.patch(`/api/events/${event.id}/`, {
        start: optimisticStart,
        end: optimisticEnd,
      });
      
      const updatedFromServer = response.data;
      // Update with the final truth from server (but keep editable flag)
      setEvents(prev => prev.map(e => 
        e.id == updatedFromServer.id 
          ? { ...updatedFromServer, editable: true, startEditable: true, durationEditable: true, resourceEditable: true } 
          : e
      ));
    } catch (error) {
      console.error('Failed to update event:', error);
      revert();
      loadEvents(); // Restore state from server on failure
    }
  };

  const handleEventResize = async (info) => {
    const { event, revert } = info;

    // Check permission
    if (!canEditEvent(event)) {
      revert();
      return;
    }

    const start = event.start;
    const end = event.end;
    const isoStart = start.toISOString();
    const isoEnd = end ? end.toISOString() : null;

    // Optimistically update local state
    setEvents(prev => prev.map(e => 
      e.id == event.id // Use loose equality
        ? { ...e, start: isoStart, end: isoEnd } 
        : e
    ));

    try {
      const response = await api.patch(`/api/events/${event.id}/`, {
        start: isoStart,
        end: isoEnd,
      });
      
      const updatedFromServer = response.data;
      // Update with the final truth from server
      setEvents(prev => prev.map(e => 
        e.id == updatedFromServer.id 
          ? { ...updatedFromServer, editable: true, startEditable: true, durationEditable: true, resourceEditable: true } 
          : e
      ));
    } catch (error) {
      console.error('Failed to update event:', error);
      revert();
      loadEvents(); // Restore state from server on failure
    }
  };

  const handleModalClose = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
    if (calendarRef.current) {
      calendarRef.current.getApi().unselect();
    }
  };

  const handleExportPDF = async () => {
    try {
      const calendarApi = calendarRef.current.getApi();
      const currentView = calendarApi.view;
      const dateRange = {
        start: currentView.activeStart,
        end: currentView.activeEnd
      };

      await exportToPDF(events, selectedClubs, dateRange, currentView.type, theme, user?.time_format || '12h', user?.timezone || 'Asia/Kolkata');
    } catch (error) {

      console.error('Failed to export PDF:', error);
      alert('Error exporting PDF. Please try again.');
    }
  };

  const canEditEvent = (event) => {
    if (!user) return false;
    if (user.is_superuser) return true;

    // Get club from event (API object) or extendedProps (FC object)
    const eventClub = event.club || (event.extendedProps && event.extendedProps.club);
    
    if (!eventClub) return false;
    
    // Extra clubs check
    const extraClubIds = user.extra_clubs?.map(c => c.id) || [];
    if (extraClubIds.includes(eventClub.id)) return true;

    // Sub-club role: can ONLY edit their specific sub-club's events
    if (user.sub_club) {
      return eventClub.id === user.sub_club.id;
    }

    // Main-club role: can edit own club's events AND any direct sub-club events
    if (user.club) {
      // Own club's event
      if (eventClub.id === user.club.id) return true;
      // Event belongs to a direct sub-club of the user's main club
      const parentId = eventClub.parent?.id ?? eventClub.parent;
      if (parentId && parentId === user.club.id) return true;
    }
    
    return false;
  };

  const userColor = user?.sub_club?.color || user?.club?.color || '#3779e6';
  const canCreate = !!(user?.club || user?.sub_club || user?.extra_clubs?.length > 0);

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-neutral-900 md:bg-slate-50 md:dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors duration-150 overflow-hidden">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar Overlay for mobile */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className={`
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-64 h-full flex flex-col flex-shrink-0 shadow-2xl md:shadow-none
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <ClubFilterSidebar
            clubs={clubs}
            selectedClubs={selectedClubs}
            onToggleClub={(clubId) => {
              setSelectedClubs((prev) =>
                prev.includes(clubId)
                  ? prev.filter((id) => id !== clubId)
                  : [...prev, clubId]
              );
            }}
            onSelectAll={() => {
              const allIds = [];
              clubs.forEach(c => {
                allIds.push(c.id);
                if (c.sub_clubs) {
                  c.sub_clubs.forEach(sub => allIds.push(sub.id));
                }
              });
              setSelectedClubs(allIds);
            }}
            onDeselectAll={() => setSelectedClubs([])}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 md:bg-slate-50 md:dark:bg-neutral-950 custom-scrollbar min-h-0">
          <div className="bg-white dark:bg-neutral-900 p-3 sm:p-6 md:shadow-xs md:border border-slate-200 dark:border-neutral-800 min-h-full flex flex-col relative transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-5 pb-3 sm:pb-4 border-b border-slate-200/80 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-700 transition-colors shadow-xs"
                  aria-label="Filter clubs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Event Calendar</h1>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">Explore, schedule, and track campus club activities</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {!isGuest && (
                  <button
                    onClick={handleExportPDF}
                    className="flex-1 sm:flex-none bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 px-3.5 py-2 rounded-lg font-medium text-xs sm:text-sm border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 text-slate-500 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF
                  </button>
                )}

                {!isGuest && (user?.club || user?.sub_club || user?.extra_clubs?.length > 0) && (
                  <button
                    onClick={() => {
                      setSelectedEvent({ start: new Date(), end: new Date() });
                      setShowEventModal(true);
                    }}
                    className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-xs sm:text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Event
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-transparent md:bg-slate-50/50 dark:md:bg-neutral-950/40 rounded-none md:rounded-xl overflow-visible md:overflow-y-auto p-0 md:p-2 border-0 md:border border-slate-200/60 dark:border-neutral-800 md:custom-scrollbar">
              <Calendar
                ref={calendarRef}
                events={events}
                userColor={userColor}
                timeFormat={user?.time_format || '12h'}
                timezone={user?.timezone || 'Asia/Kolkata'}
                selectable={!isGuest && canCreate}
                onEventClick={handleEventClick}
                onDateSelect={!isGuest ? handleDateSelect : undefined}
                onDatesSet={loadEvents}
                onEventDrop={!isGuest ? handleEventDrop : undefined}
                onEventResize={!isGuest ? handleEventResize : undefined}
              />

            </div>
          </div>
        </div>
      </div>

      {showEventModal && (
        <EventModal
          event={selectedEvent}
          canEdit={selectedEvent?.id ? canEditEvent(selectedEvent) : true}
          timeFormat={user?.time_format || '12h'}
          onClose={handleModalClose}
          onSave={handleEventSaved}
          onDelete={handleEventDeleted}
          clubs={clubs}
        />
      )}
    </div>
  );
}
