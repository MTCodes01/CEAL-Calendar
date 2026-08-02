import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import ClubManagement from '../components/ClubManagement';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'clubs'
  const [users, setUsers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedSubClub, setSelectedSubClub] = useState('');
  const [selectedExtraClubs, setSelectedExtraClubs] = useState([]);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, clubsRes] = await Promise.all([
        api.get('/api/auth/users/'),
        api.get('/api/clubs/')
      ]);
      setUsers(usersRes.data.results || usersRes.data);
      setClubs(clubsRes.data.results || clubsRes.data);
    } catch (err) {
      setError('Failed to load data. Ensure you are an admin.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (u) => {
    setEditingUser(u);
    setSelectedClub(u.club ? u.club.id : '');
    setSelectedSubClub(u.sub_club ? u.sub_club.id : '');
    setSelectedExtraClubs(u.extra_clubs ? u.extra_clubs.map(c => c.id) : []);
  };

  const handleSave = async () => {
    try {
      await api.patch(`/api/auth/users/${editingUser.id}/`, {
        club: selectedClub || null,
        sub_club: selectedSubClub || null,
        extra_clubs: selectedExtraClubs,
      });
      setEditingUser(null);
      fetchData();
    } catch (err) {
      console.error('Failed to update user', err);
      alert('Failed to update user');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.delete(`/api/auth/users/${userId}/`);
        fetchData();
      } catch (err) {
        console.error('Failed to delete user', err);
        alert('Failed to delete user');
      }
    }
  };

  const toggleExtraClub = (clubId) => {
    setSelectedExtraClubs(prev =>
      prev.includes(clubId)
        ? prev.filter(id => id !== clubId)
        : [...prev, clubId]
    );
  };

  // Filter sub-clubs based on selected parent club using the nested structure
  const selectedMainClub = clubs.find(c => c.id === parseInt(selectedClub));
  const subClubOptions = selectedMainClub?.sub_clubs || [];
  
  // Main clubs are those returned at the top level (they have no parent in the new API)
  const mainClubOptions = clubs;

  // All clubs that can serve as "extra" clubs (all clubs flattened)
  const allFlatClubs = clubs.reduce((acc, c) => {
    acc.push(c);
    if (c.sub_clubs) acc.push(...c.sub_clubs);
    return acc;
  }, []);

  const primaryClubIds = new Set([
    selectedClub ? parseInt(selectedClub) : null,
    selectedSubClub ? parseInt(selectedSubClub) : null,
  ].filter(Boolean));

  const extraClubOptions = allFlatClubs.filter(c => !primaryClubIds.has(c.id));

  const filteredUsers = users.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    
    const hasMainClub = u.club && u.club.name && u.club.name.toLowerCase().includes(query);
    const hasSubClub = u.sub_club && u.sub_club.name && u.sub_club.name.toLowerCase().includes(query);
    const hasExtraClub = u.extra_clubs && u.extra_clubs.some(c => c.name && c.name.toLowerCase().includes(query));

    return fullName.includes(query) || 
           (u.email && u.email.toLowerCase().includes(query)) ||
           (u.username && u.username.toLowerCase().includes(query)) ||
           hasMainClub || hasSubClub || hasExtraClub;
  });

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        
        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'users' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            Manage Users
          </button>
          <button
            onClick={() => setActiveTab('clubs')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'clubs' ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          >
            Manage Clubs
          </button>
        </div>
      </div>
      
      {activeTab === 'users' ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 space-y-4 md:space-y-0">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Users & Roles</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all users and assign them to clubs.</p>
            </div>
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search users or clubs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors shadow-sm"
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 shadow-xl overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300">
            <div className="overflow-x-auto custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">User Details</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Email Address</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Main Club</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Sub Club</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Additional Clubs</th>
                  <th className="px-4 sm:px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No users found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-primary-500/5 transition-colors group">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {u.first_name} {u.last_name}
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5 opacity-70">@{u.username}</div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {u.email}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      {u.club ? (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-none font-extrabold rounded-full border shadow-sm uppercase tracking-wider" 
                              style={{ borderColor: u.club.color + '40', color: u.club.color, backgroundColor: u.club.color + '15' }}>
                          {u.club.name}
                        </span>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      {u.sub_club ? (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-none font-extrabold rounded-full border shadow-sm uppercase tracking-wider"
                              style={{ borderColor: u.sub_club.color + '40', color: u.sub_club.color, backgroundColor: u.sub_club.color + '15' }}>
                          {u.sub_club.name}
                        </span>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm">
                      {u.extra_clubs && u.extra_clubs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {u.extra_clubs.map(ec => (
                            <span
                              key={ec.id}
                              className="px-2 py-0.5 inline-flex text-xs leading-none font-bold rounded-full border"
                              style={{ borderColor: ec.color + '40', color: ec.color, backgroundColor: ec.color + '15' }}
                            >
                              {ec.name}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-bold space-x-3">
                      <button onClick={() => handleEditClick(u)} className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">Delete</button>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      ) : (
        <ClubManagement />
      )}

      {activeTab === 'users' && editingUser && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 dark:border-gray-700">
              <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg leading-6 font-bold text-gray-900 dark:text-white" id="modal-title">
                    Assign Roles
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate ml-2">{editingUser.email}</p>
                </div>
                <div className="space-y-5">
                  {/* Main Club */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Main Club</label>
                    <select
                      value={selectedClub}
                      onChange={(e) => {
                        setSelectedClub(e.target.value);
                        setSelectedSubClub('');
                        // Remove from extra_clubs if now a primary club
                        if (e.target.value) {
                          setSelectedExtraClubs(prev => prev.filter(id => id !== parseInt(e.target.value)));
                        }
                      }}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">None (Viewer Only)</option>
                      {mainClubOptions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sub Club */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Sub Club</label>
                    <select
                      value={selectedSubClub}
                      onChange={(e) => {
                        setSelectedSubClub(e.target.value);
                        if (e.target.value) {
                          setSelectedExtraClubs(prev => prev.filter(id => id !== parseInt(e.target.value)));
                        }
                      }}
                      disabled={!selectedClub}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg dark:bg-gray-700 dark:text-white disabled:opacity-50"
                    >
                      <option value="">None</option>
                      {subClubOptions.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {!selectedClub && <p className="text-xs text-gray-500 mt-1.5">Assign a main club first to see sub-club options.</p>}
                  </div>

                  {/* Additional Clubs */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Additional Clubs
                      <span className="ml-1.5 text-xs font-normal text-gray-400">(optional — multi-select)</span>
                    </label>
                    {extraClubOptions.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No other clubs available.</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-900/30">
                        {extraClubOptions.map(c => {
                          const checked = selectedExtraClubs.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
                                checked
                                  ? 'bg-white dark:bg-gray-700 shadow-sm'
                                  : 'hover:bg-white dark:hover:bg-gray-700/50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleExtraClub(c.id)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: c.color }}
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">{c.name}</span>
                              {c.parent && (
                                <span className="text-xs text-gray-400 ml-auto">sub-club</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {selectedExtraClubs.length > 0 && (
                      <p className="text-xs text-primary-600 dark:text-primary-400 mt-1.5 font-medium">
                        {selectedExtraClubs.length} additional club{selectedExtraClubs.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex justify-center rounded-xl border border-transparent shadow-sm px-5 py-2 bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="inline-flex justify-center rounded-xl border border-gray-300 dark:border-gray-600 shadow-sm px-5 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};

export default AdminDashboard;
