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
    sender_password: ''
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

    // Update local state immediately for smooth UI
    const updatedItems = items.map((item, index) => ({ ...item, order: index }));
    setClubs(updatedItems);

    // Save all new orders to backend
    try {
      await Promise.all(
        updatedItems.map((item) =>
          api.patch(`/api/clubs/manage/${item.id}/`, { order: item.order })
        )
      );
    } catch (err) {
      console.error('Failed to save reordering', err);
      fetchClubs(); // Revert on failure
    }
  };

  const handleSubClubDragEnd = async (parentId, result) => {
    if (!result.destination) return;

    const parentClub = clubs.find(c => c.id === parentId);
    if (!parentClub || !parentClub.sub_clubs) return;

    const subClubs = Array.from(parentClub.sub_clubs);
    const [reorderedItem] = subClubs.splice(result.source.index, 1);
    subClubs.splice(result.destination.index, 0, reorderedItem);

    const updatedSubClubs = subClubs.map((item, index) => ({ ...item, order: index }));
    
    // Update local state
    setClubs(clubs.map(c => 
      c.id === parentId ? { ...c, sub_clubs: updatedSubClubs } : c
    ));

    // Save to backend
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
      setFormData({ name: '', slug: '', color: '#3B82F6', parent: null, order: 0, sender_email: '', sender_password: '' });
      fetchClubs();
    } catch (err) {
      console.error('Failed to save club', err);
      alert('Failed to save club. Ensure slug is unique.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this club? All events and sub-clubs will be affected.')) return;
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
      sender_password: ''
    });
    setIsAdding(true);
  };

  if (loading) return <div className="p-4">Loading clubs...</div>;

  const filteredClubs = clubs.filter(c => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    
    const matchesMain = c.name.toLowerCase().includes(query) || c.slug.toLowerCase().includes(query);
    const matchesSub = c.sub_clubs && c.sub_clubs.some(sub => 
      sub.name.toLowerCase().includes(query) || sub.slug.toLowerCase().includes(query)
    );
    
    return matchesMain || matchesSub;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Clubs & Hierarchy</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all clubs, sub-clubs, and their respective ordering.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
            />
          </div>
          <button
            onClick={() => { setIsAdding(true); setEditingClub(null); setFormData({ name: '', slug: '', color: '#3B82F6', parent: null, order: 0, sender_email: '', sender_password: '' }); }}
            className="w-full sm:w-auto px-5 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            + Add New Club
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6 mb-8 transition-all">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingClub ? `Edit Club: ${editingClub.name}` : 'Create New Club'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {editingClub ? 'Update the details of this club below.' : 'Fill in the details to create a new club or sub-club.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-2.5 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-colors shadow-sm sm:text-sm placeholder-gray-400"
                placeholder="e.g. Computer Society"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Slug (unique)</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-2.5 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-colors shadow-sm sm:text-sm placeholder-gray-400 font-mono"
                placeholder="e.g. ieee-cs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color (Hex)</label>
              <div className="flex items-center space-x-3">
                <div className="p-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 shadow-sm">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-8 w-8 rounded border-0 p-0 cursor-pointer bg-transparent"
                  />
                </div>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-2.5 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-colors shadow-sm sm:text-sm font-mono uppercase"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Parent Club</label>
              <select
                value={formData.parent || ''}
                onChange={(e) => setFormData({ ...formData, parent: e.target.value || null })}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-2.5 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-colors shadow-sm sm:text-sm"
              >
                <option value="">None (Main Club)</option>
                {clubs.filter(c => !c.parent && c.id !== editingClub?.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {!formData.parent && (
            <>
              <div className="border-b border-gray-200 dark:border-gray-700 pb-4 pt-4 mt-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Email Notification Settings (Optional)</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Configure a custom sender email and app password for this club's event notifications. Leave blank to use the system default.
                </p>
                {editingClub?.has_custom_email && (
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                    Custom credentials are securely configured. Provide a new password below only if you wish to change it. To remove custom credentials, clear the email field and save.
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Sender Email</label>
                  <input
                    type="email"
                    value={formData.sender_email}
                    onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-2.5 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-colors shadow-sm sm:text-sm placeholder-gray-400"
                    placeholder="e.g. club@gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">App Password</label>
                  <input
                    type="password"
                    value={formData.sender_password}
                    onChange={(e) => setFormData({ ...formData, sender_password: e.target.value })}
                    className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-2.5 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-colors shadow-sm sm:text-sm placeholder-gray-400"
                    placeholder={editingClub?.has_custom_email ? "••••••••••••••••" : "Leave blank to use default"}
                  />
                </div>
              </div>
            </>
          )}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 shadow-sm transition-all focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              {editingClub ? 'Update Club' : 'Create Club'}
            </button>
          </div>
        </form>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="main-clubs">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
              {filteredClubs.map((club, index) => (
                <Draggable key={club.id} draggableId={`club-${club.id}`} index={index} isDragDisabled={!!searchQuery}>
                  {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-4">
                            <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1">
                              {/* Drag handle icon */}
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M7 2a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zM7 9a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm-6 7a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4z" />
                              </svg>
                            </div>
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-inner ring-1 ring-black/5" style={{ backgroundColor: club.color }}>
                              <span className="text-white text-xs font-bold leading-none">{club.name.charAt(0)}</span>
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-wide">{club.name}</h4>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">/{club.slug}</div>
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            <button onClick={() => openEdit(club)} className="px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors">Edit</button>
                            <button onClick={() => handleDelete(club.id)} className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">Delete</button>
                          </div>
                        </div>

                        {/* Sub-clubs section */}
                        <DragDropContext onDragEnd={(result) => handleSubClubDragEnd(club.id, result)}>
                          <Droppable droppableId={`subclubs-${club.id}`}>
                            {(subProvided) => (
                              <div {...subProvided.droppableProps} ref={subProvided.innerRef} className="ml-10 space-y-2 mt-3 border-l-2 border-gray-100 dark:border-gray-700/50 pl-4 py-1">
                                {club.sub_clubs && club.sub_clubs.filter(sub => {
                                  if (!searchQuery) return true;
                                  const query = searchQuery.toLowerCase();
                                  return sub.name.toLowerCase().includes(query) || sub.slug.toLowerCase().includes(query);
                                }).map((sub, sIndex) => (
                                  <Draggable key={sub.id} draggableId={`sub-${sub.id}`} index={sIndex} isDragDisabled={!!searchQuery}>
                                    {(subDragProvided) => (
                                      <div
                                        ref={subDragProvided.innerRef}
                                        {...subDragProvided.draggableProps}
                                        className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                                      >
                                        <div className="flex items-center space-x-3">
                                          <div {...subDragProvided.dragHandleProps} className="text-gray-400 hover:text-gray-600 p-0.5 cursor-grab active:cursor-grabbing">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zM7 9a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm-6 7a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4zm3 0a2 2 0 100 4 2 2 0 000-4z" /></svg>
                                          </div>
                                          <div className="flex items-center justify-center w-6 h-6 rounded-md shadow-inner ring-1 ring-black/5" style={{ backgroundColor: sub.color }}>
                                            <span className="text-white text-[10px] font-bold leading-none">{sub.name.charAt(0)}</span>
                                          </div>
                                          <div>
                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{sub.name}</span>
                                            <span className="text-xs text-gray-400 font-mono ml-2 group-hover:text-gray-500">/{sub.slug}</span>
                                          </div>
                                        </div>
                                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100">
                                          <button onClick={() => openEdit(sub)} className="px-2.5 py-1 text-xs font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-md transition-colors">Edit</button>
                                          <button onClick={() => handleDelete(sub.id)} className="px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors">Delete</button>
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
