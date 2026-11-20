import { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getContrastColor } from '../utils/colorUtils';
import { fuzzySearch } from '../utils/fuzzySearch';

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
  const [collabSearch, setCollabSearch] = useState('');
  const [isCollabDropdownOpen, setIsCollabDropdownOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(true);
  const collabDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (collabDropdownRef.current && !collabDropdownRef.current.contains(e.target)) {
        setIsCollabDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dynamically position dropdown upwards if near bottom of modal viewport
  useEffect(() => {
    if (isCollabDropdownOpen && collabDropdownRef.current) {
      const rect = collabDropdownRef.current.getBoundingClientRect();
      const modal = collabDropdownRef.current.closest('.overflow-y-auto');
      if (modal) {
        const modalRect = modal.getBoundingClientRect();
        const spaceBelow = modalRect.bottom - rect.bottom;
        const spaceAbove = rect.top - modalRect.top;
        setOpenUpwards(spaceBelow < 210 && spaceAbove > 180);
      } else {
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUpwards(spaceBelow < 210);
      }
    }
  }, [isCollabDropdownOpen, collabSearch]);

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
    setCollabSearch('');
    setIsCollabDropdownOpen(false);
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
      className={`${small ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'} inline-flex items-center gap-1.5 rounded-md font-semibold border`}
      style={{
        backgroundColor: club.color + '15',
        color: club.color,
        borderColor: club.color + '40',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: club.color }} />
      {club.name}
    </span>
  );

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors">
        <div className="p-6">
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-neutral-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditMode ? (canEdit ? 'Edit Event' : 'Event Details') : 'Create Event'}
            </h2>
            <button 
              onClick={onClose} 
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-lg mb-4 text-xs font-medium">
              {error}
            </div>
          )}

          {isEditMode && !canEdit ? (
            /* ── READ-ONLY VIEW ─────────────────────────────────────────── */
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{event.title}</h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">Organized by {event.created_by_name}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-400 mb-1.5">Host Club</label>
                <div
                  className="px-3 py-1.5 rounded-md inline-flex items-center gap-2 font-semibold text-xs border"
                  style={{
                    backgroundColor: event.club.color,
                    borderColor: event.club.color,
                    color: getContrastColor(event.club.color),
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block"
                    style={{ backgroundColor: getContrastColor(event.club.color) }}
                  />
                  {event.club.name}
                </div>
              </div>
              {event.collaborating_clubs && event.collaborating_clubs.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-400 mb-1.5">Collaborating Clubs</label>
                  <div className="flex flex-wrap gap-1.5">
                    {event.collaborating_clubs.map(c => <ClubBadge key={c.id} club={c} />)}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-400 mb-1">Date &amp; Time</label>
                <p className="text-sm text-slate-800 dark:text-neutral-200">
                  {new Date(event.start).toLocaleString([], { hour12: timeFormat === '12h', dateStyle: 'medium', timeStyle: 'short', timeZone: user?.timezone || 'Asia/Kolkata' })} &ndash; {new Date(event.end).toLocaleString([], { hour12: timeFormat === '12h', dateStyle: 'medium', timeStyle: 'short', timeZone: user?.timezone || 'Asia/Kolkata' })}
                </p>
              </div>

              {event.location && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-400 mb-1">Location</label>
                  <p className="text-sm text-slate-800 dark:text-neutral-200 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{event.location}</span>
                  </p>
                </div>
              )}
              {event.description && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-neutral-400 mb-1">Description</label>
                  <p className="text-sm text-slate-700 dark:text-neutral-300 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
            </div>
          ) : (
            /* ── EDIT / CREATE FORM ─────────────────────────────────────── */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Club badge in edit mode */}
              {isEditMode && event?.club && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-600 dark:text-neutral-400">Host Club:</span>
                  <ClubBadge club={event.club} />
                  {event.collaborating_clubs && event.collaborating_clubs.length > 0 && (
                    <>
                      <span className="text-xs text-slate-400">•</span>
                      {event.collaborating_clubs.map(c => <ClubBadge key={c.id} club={c} small />)}
                    </>
                  )}
                </div>
              )}

              {/* Club selector — shown when creating and user has multiple options */}
              {!isEditMode && hasMultipleClubs && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                    Creating for Club *
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allUserClubs.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClubId(c.id);
                          setCollaboratingClubIds(prev => prev.filter(id => id !== c.id));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          selectedClubId === c.id
                            ? 'border-transparent shadow-xs'
                            : 'bg-white dark:bg-neutral-950 text-slate-700 dark:text-neutral-200 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-neutral-600'
                        }`}
                        style={selectedClubId === c.id ? { backgroundColor: c.color, borderColor: c.color, color: getContrastColor(c.color) } : {}}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">Event Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Tech Symposium"
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm outline-none transition-colors"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">Location *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm outline-none transition-colors"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., CS Lab 2, Main Auditorium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">Start Date &amp; Time *</label>
                  <DatePicker
                    selected={formData.start}
                    onChange={(date) => setFormData({ ...formData, start: date })}
                    showTimeSelect
                    timeFormat={timeFormat === '12h' ? 'h:mm aa' : 'HH:mm'}
                    timeIntervals={15}
                    dateFormat={timeFormat === '12h' ? 'MMMM d, yyyy h:mm aa' : 'MMMM d, yyyy HH:mm'}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">End Date &amp; Time *</label>
                  <DatePicker
                    selected={formData.end}
                    onChange={(date) => setFormData({ ...formData, end: date })}
                    showTimeSelect
                    timeFormat={timeFormat === '12h' ? 'h:mm aa' : 'HH:mm'}
                    timeIntervals={15}
                    dateFormat={timeFormat === '12h' ? 'MMMM d, yyyy h:mm aa' : 'MMMM d, yyyy HH:mm'}
                    className="w-full px-3.5 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm transition-colors focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">Description</label>
                <textarea
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm outline-none transition-colors"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional details, agenda, registration links..."
                />
              </div>

              {/* Collaborating Clubs — Searchable Fuzzy Multi-Select */}
              {collabOptions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300">
                      Collaborating Clubs
                      <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-neutral-500">(optional)</span>
                    </label>
                    {collaboratingClubIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCollaboratingClubIds([])}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-white transition-colors"
                      >
                        Clear all ({collaboratingClubIds.length})
                      </button>
                    )}
                  </div>

                  {/* Search Input & Fuzzy Dropdown */}
                  <div className="relative" ref={collabDropdownRef}>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={
                          collaboratingClubIds.length === 0
                            ? "Search and select collaborating clubs..."
                            : "Search to add more collaborators..."
                        }
                        value={collabSearch}
                        onChange={(e) => {
                          setCollabSearch(e.target.value);
                          setIsCollabDropdownOpen(true);
                        }}
                        onFocus={() => setIsCollabDropdownOpen(true)}
                        className="w-full pl-9 pr-8 py-2 border border-slate-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-xs sm:text-sm outline-none transition-colors"
                      />
                      <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {collabSearch && (
                        <button
                          type="button"
                          onClick={() => setCollabSearch('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 p-0.5 rounded transition-colors"
                          aria-label="Clear search"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Fuzzy Search Dropdown Menu */}
                    {isCollabDropdownOpen && (
                      <div className={`absolute left-0 right-0 ${
                        openUpwards ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                      } max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl z-50 p-1.5 custom-scrollbar divide-y divide-slate-100 dark:divide-neutral-800`}>
                        {fuzzySearch(collabOptions, collabSearch, c => `${c.name} ${c.slug || ''}`).length === 0 ? (
                          <div className="py-4 px-3 text-center text-xs text-slate-400 dark:text-neutral-500">
                            No clubs match "{collabSearch}"
                          </div>
                        ) : (
                          fuzzySearch(collabOptions, collabSearch, c => `${c.name} ${c.slug || ''}`).map(c => {
                            const isSelected = collaboratingClubIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  toggleCollab(c.id);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors ${
                                  isSelected
                                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                    : 'hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                                  <span className="font-medium truncate">{c.name}</span>
                                  {c.parent && (
                                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded font-normal flex-shrink-0">
                                      sub-club
                                    </span>
                                  )}
                                </div>
                                {isSelected ? (
                                  <span className="flex items-center text-blue-600 dark:text-blue-400 font-semibold text-[11px] gap-1 flex-shrink-0">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Added
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-neutral-500 text-[11px] flex-shrink-0">
                                    + Add
                                  </span>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected Collaborator Chips */}
                  {collaboratingClubIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {collaboratingClubIds.map(id => {
                        const c = allFlatClubs.find(cl => cl.id === id);
                        if (!c) return null;
                        return (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all"
                            style={{
                              backgroundColor: `${c.color}18`,
                              borderColor: `${c.color}50`,
                              color: c.color,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                            <span>{c.name}</span>
                            <button
                              type="button"
                              onClick={() => toggleCollab(c.id)}
                              className="ml-0.5 -mr-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                              aria-label={`Remove ${c.name}`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-neutral-800">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving...' : isEditMode ? 'Update Event' : 'Create Event'}
                </button>
                {isEditMode && canEdit && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50"
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
