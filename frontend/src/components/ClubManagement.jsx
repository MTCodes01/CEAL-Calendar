import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import api from '../api/client';

const ClubManagement = () => {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClub, setEditingClub] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    color: '#3B82F6',
    parent: null,
    order: 0,
    sender_email: '',
    sender_password: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchClubs();
  }, []);

  const fetchClubs = async () => {
    try {
      const res = await api.get('/api/clubs/');
      setClubs(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to fetch clubs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(clubs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setClubs(updatedItems);

    try {
      await Promise.all(
        updatedItems.map((item) =>
          api.patch(`/api/clubs/manage/${item.id}/`, { order: item.order })
        )
      );
    } catch (err) {
      console.error('Failed to save reordering', err);
      fetchClubs();
    }
  };

  const handleSubClubDragEnd = async (parentId, result) => {
    if (!result.destination) return;

    const parentClub = clubs.find((c) => c.id === parentId);
    if (!parentClub || !parentClub.sub_clubs) return;

    const subClubs = Array.from(parentClub.sub_clubs);
    const [reorderedItem] = subClubs.splice(result.source.index, 1);
    subClubs.splice(result.destination.index, 0, reorderedItem);

    const updatedSubClubs = subClubs.map((item, index) => ({ ...item, order: index }));

    setClubs(
      clubs.map((c) => (c.id === parentId ? { ...c, sub_clubs: updatedSubClubs } : c))
    );

    try {
      await Promise.all(
        updatedSubClubs.map((item) =>
          api.patch(`/api/clubs/manage/${item.id}/`, { order: item.order })
        )
      );
    } catch (err) {
      console.error('Failed to save sub-club reordering', err);
      fetchClubs();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingClub) {
        await api.put(`/api/clubs/manage/${editingClub.id}/`, formData);
      } else {
        await api.post('/api/clubs/manage/', formData);
      }
      setEditingClub(null);
      setIsAdding(false);
      setFormData({
        name: '',
        slug: '',
        color: '#3B82F6',
        parent: null,
        order: 0,
        sender_email: '',
        sender_password: '',
      });
      fetchClubs();
    } catch (err) {
      console.error('Failed to save club', err);
      const errorMsg = err.response?.data
        ? typeof err.response.data === 'object'
          ? JSON.stringify(err.response.data)
          : err.response.data
        : err.message;
      alert(`Failed to save club: ${errorMsg}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this club? All events and sub-clubs will be affected.'))
      return;
    try {
      await api.delete(`/api/clubs/manage/${id}/`);
      fetchClubs();
    } catch (err) {
      console.error('Failed to delete club', err);
    }
  };

  const openEdit = (club) => {
    setEditingClub(club);
    setFormData({
      name: club.name,
      slug: club.slug,
      color: club.color,
      parent: club.parent,
      order: club.order,
      sender_email: club.sender_email || '',
      sender_password: '',
    });
    setIsAdding(true);
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-500 dark:text-neutral-400">
        Loading clubs...
      </div>
    );
  }

  const filteredClubs = clubs.filter((c) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    const matchesMain = c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query);
    const matchesSub =
      c.sub_clubs &&
      c.sub_clubs.some(
        (sub) => sub.name.toLowerCase().includes(query) || sub.slug.toLowerCase().includes(query)
      );

    return matchesMain || matchesSub;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Clubs &amp; Hierarchy
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Manage student organizations, sub-clubs, brand colors, and display order.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-colors shadow-xs"
            />
          </div>
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingClub(null);
              setFormData({
                name: '',
                slug: '',
                color: '#3B82F6',
                parent: null,
                order: 0,
                sender_email: '',
                sender_password: '',
              });
            }}
            className="px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            + Add Club
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-neutral-900 p-5 rounded-xl border border-slate-200 dark:border-neutral-800 shadow-xs space-y-4 mb-4 transition-colors text-xs"
        >
          <div className="border-b border-slate-100 dark:border-neutral-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {editingClub ? `Edit Club: ${editingClub.name}` : 'Create New Club'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
              {editingClub
                ? 'Update organization details, brand accent color, and routing.'
                : 'Fill in details to register a new main club or chapter.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Name
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-colors"
                placeholder="e.g. FOSS CEAL"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Slug (unique)
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono transition-colors"
                placeholder="e.g. foss"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Color (Hex)
              </label>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-6 w-6 rounded border-0 p-0 cursor-pointer bg-transparent"
                  />
                </div>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono uppercase transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                Parent Club
              </label>
              <select
                value={formData.parent || ''}
                onChange={(e) => setFormData({ ...formData, parent: e.target.value || null })}
                className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-colors"
              >
                <option value="">None (Main Club)</option>
                {clubs
                  .filter((c) => !c.parent && c.id !== editingClub?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {!formData.parent && (
            <>
              <div className="border-b border-slate-100 dark:border-neutral-800 pb-2 pt-2">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Email Notification Settings (Optional)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                  Configure custom sender email and app password for event notifications.
                </p>
                {editingClub?.has_custom_email && (
                  <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Custom credentials configured. Leave password blank to retain current key.
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    Sender Email
                  </label>
                  <input
                    type="email"
                    value={formData.sender_email}
                    onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-colors"
                    placeholder="club@ceal.in"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
                    App Password
                  </label>
                  <input
                    type="password"
                    value={formData.sender_password}
                    onChange={(e) => setFormData({ ...formData, sender_password: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs transition-colors"
                    placeholder={editingClub?.has_custom_email ? '••••••••••••••••' : 'Leave blank to use default'}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg border border-slate-200 dark:border-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 shadow-xs transition-colors"
            >
              {editingClub ? 'Update Club' : 'Create Club'}
            </button>
          </div>
        </form>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="main-clubs">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
              {filteredClubs.map((club, index) => (
                <Draggable
                  key={club.id}
                  draggableId={`club-${club.id}`}
                  index={index}
                  isDragDisabled={!!searchQuery}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="bg-white dark:bg-neutral-900 p-4 rounded-xl shadow-xs border border-slate-200 dark:border-neutral-800 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                          <div
                            {...provided.dragHandleProps}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 cursor-grab active:cursor-grabbing p-1 flex-shrink-0"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M7 2a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zM7 9a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm-6 7a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4z" />
                            </svg>
                          </div>
                          <div
                            className="flex items-center justify-center w-7 h-7 rounded-md font-bold text-xs text-white shadow-xs flex-shrink-0"
                            style={{ backgroundColor: club.color }}
                          >
                            {club.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider truncate">
                              {club.name}
                            </h4>
                            <div className="text-[11px] text-slate-400 dark:text-neutral-500 font-mono truncate">
                              /{club.slug}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium flex-shrink-0">
                          <button
                            onClick={() => openEdit(club)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(club.id)}
                            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Sub-clubs section */}
                      <DragDropContext
                        onDragEnd={(result) => handleSubClubDragEnd(club.id, result)}
                      >
                        <Droppable droppableId={`subclubs-${club.id}`}>
                          {(subProvided) => (
                            <div
                              {...subProvided.droppableProps}
                              ref={subProvided.innerRef}
                              className="ml-3 sm:ml-8 space-y-1.5 mt-3 border-l-2 border-slate-200 dark:border-neutral-800 pl-2.5 sm:pl-4 py-1"
                            >
                              {club.sub_clubs &&
                                club.sub_clubs
                                  .filter((sub) => {
                                    if (!searchQuery) return true;
                                    const query = searchQuery.toLowerCase();
                                    return (
                                      sub.name.toLowerCase().includes(query) ||
                                      sub.slug.toLowerCase().includes(query)
                                    );
                                  })
                                  .map((sub, sIndex) => (
                                    <Draggable
                                      key={sub.id}
                                      draggableId={`sub-${sub.id}`}
                                      index={sIndex}
                                      isDragDisabled={!!searchQuery}
                                    >
                                      {(subDragProvided) => (
                                        <div
                                          ref={subDragProvided.innerRef}
                                          {...subDragProvided.draggableProps}
                                          className="flex items-center justify-between gap-2 p-2 bg-slate-50 dark:bg-neutral-950/60 rounded-lg border border-slate-200 dark:border-neutral-800 transition-colors"
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <div
                                              {...subDragProvided.dragHandleProps}
                                              className="text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300 cursor-grab active:cursor-grabbing p-0.5 flex-shrink-0"
                                            >
                                              <svg
                                                className="w-3.5 h-3.5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path d="M7 2a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zM7 9a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm-6 7a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4z" />
                                              </svg>
                                            </div>
                                            <div
                                              className="flex items-center justify-center w-5 h-5 rounded-md font-bold text-[10px] text-white shadow-xs flex-shrink-0"
                                              style={{ backgroundColor: sub.color }}
                                            >
                                              {sub.name.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1 truncate">
                                              <span className="text-xs font-semibold text-slate-800 dark:text-neutral-200">
                                                {sub.name}
                                              </span>
                                              <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono ml-1.5">
                                                /{sub.slug}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 text-[11px] font-medium flex-shrink-0">
                                            <button
                                              onClick={() => openEdit(sub)}
                                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                            >
                                              Edit
                                            </button>
                                            <button
                                              onClick={() => handleDelete(sub.id)}
                                              className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                              {subProvided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </DragDropContext>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default ClubManagement;
