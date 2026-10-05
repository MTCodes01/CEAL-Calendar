import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getContrastColor } from '../utils/colorUtils';

export default function EventModal({ event, canEdit, timeFormat = '12h', onClose, onSave, onDelete, clubs = [] }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start: new Date(),
    end: new Date(),
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditMode = !!event?.id;

  // --------------------------------------------------------------------------
  // Compute all clubs this user can create events for
  // --------------------------------------------------------------------------
  const buildAllUserClubs = () => {
    const seen = new Set();
    const result = [];
    const addClub = (c) => {
      if (c && !seen.has(c.id)) {
        seen.add(c.id);
        result.push(c);
      }
    };
    if (user?.sub_club) {
      addClub(user.sub_club);
    } else if (user?.club) {
      addClub(user.club);
      (user.club.sub_clubs || []).forEach(addClub);
    }
    (user?.extra_clubs || []).forEach(addClub);
    return result;
  };

  const allUserClubs = buildAllUserClubs();
  const hasMultipleClubs = allUserClubs.length > 1;

  // Default selected club: sub_club > first available
  const defaultClubId = () => {
    if (user?.sub_club) return user.sub_club.id;
    if (allUserClubs.length > 0) return allUserClubs[0].id;
    return null;
  };

  const [selectedClubId, setSelectedClubId] = useState(null);
  const [collaboratingClubIds, setCollaboratingClubIds] = useState([]);

  useEffect(() => {
    if (event) {
      const rawStart = event.start ? new Date(event.start) : new Date();
      let rawEnd   = event.end   ? new Date(event.end)   : new Date();

      // FullCalendar sends end = midnight of next day for all-day / row clicks.
      // Detect: end is exactly 00:00:00 AND falls on a different calendar day than start.
      const endIsMidnight = rawEnd.getHours() === 0 && rawEnd.getMinutes() === 0 && rawEnd.getSeconds() === 0;
      const endIsNextDay  = rawEnd.getDate()  !== rawStart.getDate()  ||
                            rawEnd.getMonth() !== rawStart.getMonth() ||
                            rawEnd.getFullYear() !== rawStart.getFullYear();
      if (!isEditMode && endIsMidnight && endIsNextDay) {
        // FullCalendar selection end is exclusive (midnight of the day *after* selection).
        // Subtract 1 minute to make it 23:59 on the actual last selected day.
        rawEnd = new Date(rawEnd.getTime() - 60000); 
      }

      setFormData({
        title:       event.title       || '',
        description: event.description || '',
        start:       rawStart,
        end:         rawEnd,
        location:    event.location    || '',
      });
      // Pre-fill collab clubs if editing
      if (isEditMode && event.collaborating_clubs) {
        setCollaboratingClubIds(event.collaborating_clubs.map(c => c.id));
      }
    }
    // Default club selection on open (new event)
    if (!isEditMode) {
      setSelectedClubId(defaultClubId());
      setCollaboratingClubIds([]);
    }
  }, [event]);

  // Clubs available for collab (everything except the chosen creating club)
  const allFlatClubs = clubs.reduce((acc, c) => {
    acc.push(c);
    if (c.sub_clubs) acc.push(...c.sub_clubs);
    return acc;
  }, []);

  const collabOptions = allFlatClubs.filter(c => c.id !== (isEditMode ? event?.club?.id : selectedClubId));

  const toggleCollab = (clubId) => {
    setCollaboratingClubIds(prev =>
      prev.includes(clubId) ? prev.filter(id => id !== clubId) : [...prev, clubId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEditMode) {
        await api.put(`/api/events/${event.id}/`, {
          ...formData,
          collaborating_club_ids: collaboratingClubIds,
        });
      } else {
        const payload = { ...formData, collaborating_club_ids: collaboratingClubIds };
        // Send club_id if user has multiple club options; otherwise backend auto-assigns
        if (hasMultipleClubs && selectedClubId) {
          payload.club_id = selectedClubId;
        } else if (user?.is_superuser && selectedClubId) {
          payload.club_id = selectedClubId;
        }
        await api.post('/api/events/', payload);
      }
      onSave();
    } catch (err) {
      const errData = err.response?.data;
      let errMsg = 'Failed to save event';
      
      if (typeof errData === 'string') {
        errMsg = errData;
      } else if (errData?.error && typeof errData.error === 'string') {
        errMsg = errData.error;
      } else if (errData?.detail) {
        errMsg = typeof errData.detail === 'string' ? errData.detail : (errData.detail.detail || errMsg);
      } else if (errData) {
        // Collect field errors
        const fields = Object.keys(errData);
        if (fields.length > 0) {
          const firstField = fields[0];
          const fieldError = Array.isArray(errData[firstField]) ? errData[firstField][0] : errData[firstField];
          errMsg = `${firstField}: ${fieldError}`;
        }
      }
      
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    setLoading(true);
    try {
      await api.delete(`/api/events/${event.id}/`);
      onDelete();
    } catch (err) {
      const errData = err.response?.data;
      setError(errData?.error || 'Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  // Helper to render a club chip badge
  const ClubBadge = ({ club, small = false }) => (
    <span
      className={`${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'} inline-flex items-center gap-1.5 rounded-full font-bold`}
      style={{
        backgroundColor: club.color + '20',
        color: club.color,
        border: `1px solid ${club.color}50`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: club.color }} />
      {club.name}
    </span>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800/90 backdrop-blur-xl border border-transparent dark:border-white/5 rounded-2xl shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-200">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? (canEdit ? 'Edit Event' : 'Event Details') : 'Create Event'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              &times;
            </button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {isEditMode && !canEdit ? (
            /* ── READ-ONLY VIEW ─────────────────────────────────────────── */
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{event.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">by {event.created_by_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Club</label>
                <div
                  className="px-4 py-2 rounded-lg inline-flex items-center gap-2 font-semibold text-sm shadow-md"
                  style={{
                    backgroundColor: event.club.color,
                    color: getContrastColor(event.club.color),
                    boxShadow: `0 2px 8px ${event.club.color}55`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block opacity-70"
                    style={{ backgroundColor: getContrastColor(event.club.color) }}
                  />
                  {event.club.name}
                </div>
              </div>
              {event.collaborating_clubs && event.collaborating_clubs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">🤝 Collaborating Clubs</label>
                  <div className="flex flex-wrap gap-2">
                    {event.collaborating_clubs.map(c => <ClubBadge key={c.id} club={c} />)}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date &amp; Time</label>
                <p className="text-gray-900 dark:text-gray-100">
                  {new Date(event.start).toLocaleString([], { hour12: timeFormat === '12h', dateStyle: 'medium', timeStyle: 'short', timeZone: user?.timezone || 'Asia/Kolkata' })} - {new Date(event.end).toLocaleString([], { hour12: timeFormat === '12h', dateStyle: 'medium', timeStyle: 'short', timeZone: user?.timezone || 'Asia/Kolkata' })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <p className="text-gray-900 dark:text-gray-100">📍 {event.location}</p>
              </div>
              {event.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <p className="text-gray-700 dark:text-gray-300">{event.description}</p>
                </div>
              )}
            </div>
          ) : (
            /* ── EDIT / CREATE FORM ─────────────────────────────────────── */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Club badge in edit mode */}
              {isEditMode && event?.club && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Club:</span>
                  <ClubBadge club={event.club} />
                  {event.collaborating_clubs && event.collaborating_clubs.length > 0 && (
                    <>
                      <span className="text-xs text-gray-400">🤝</span>
                      {event.collaborating_clubs.map(c => <ClubBadge key={c.id} club={c} small />)}
                    </>
                  )}
                </div>
              )}

              {/* Club selector — shown when creating and user has multiple options */}
              {!isEditMode && hasMultipleClubs && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Creating for Club *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allUserClubs.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClubId(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all duration-150 ${
                          selectedClubId === c.id
                            ? 'text-white border-transparent shadow-md dark:shadow-sm'
                            : 'bg-white dark:bg-gray-900/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20'
                        }`}
                        style={selectedClubId === c.id ? { backgroundColor: c.color, borderColor: c.color } : {}}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location *</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., CS Lab 2, Main Auditorium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date &amp; Time *</label>
                  <DatePicker
                    selected={formData.start}
                    onChange={(date) => setFormData({ ...formData, start: date })}
                    showTimeSelect
                    timeFormat={timeFormat === '12h' ? 'h:mm aa' : 'HH:mm'}
                    timeIntervals={15}
                    dateFormat={timeFormat === '12h' ? 'MMMM d, yyyy h:mm aa' : 'MMMM d, yyyy HH:mm'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date &amp; Time *</label>
                  <DatePicker
                    selected={formData.end}
                    onChange={(date) => setFormData({ ...formData, end: date })}
                    showTimeSelect
                    timeFormat={timeFormat === '12h' ? 'h:mm aa' : 'HH:mm'}
                    timeIntervals={15}
                    dateFormat={timeFormat === '12h' ? 'MMMM d, yyyy h:mm aa' : 'MMMM d, yyyy HH:mm'}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Collaborating Clubs */}
              {collabOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🤝 Collaborating Clubs
                    <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1 border border-gray-200 dark:border-white/5 rounded-lg p-2 bg-gray-50 dark:bg-gray-900/30 shadow-inner">
                    {collabOptions.map(c => {
                      const checked = collaboratingClubIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                            checked ? 'bg-white dark:bg-gray-800/80 shadow-sm dark:shadow-md' : 'hover:bg-white dark:hover:bg-gray-800/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCollab(c.id)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{c.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {collaboratingClubIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {collaboratingClubIds.map(id => {
                        const c = allFlatClubs.find(cl => cl.id === id);
                        return c ? <ClubBadge key={id} club={c} small /> : null;
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-500 shadow-md dark:shadow-sm hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? 'Saving...' : isEditMode ? 'Update Event' : 'Create Event'}
                </button>
                {isEditMode && canEdit && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-6 bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                  >
                    Delete
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
