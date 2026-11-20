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
        api.get('/api/clubs/'),
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
    setSelectedExtraClubs(u.extra_clubs ? u.extra_clubs.map((c) => c.id) : []);
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
    setSelectedExtraClubs((prev) =>
      prev.includes(clubId) ? prev.filter((id) => id !== clubId) : [...prev, clubId]
    );
  };

  // Filter sub-clubs based on selected parent club using the nested structure
  const selectedMainClub = clubs.find((c) => c.id === parseInt(selectedClub));
  const subClubOptions = selectedMainClub?.sub_clubs || [];

  // Main clubs are those returned at the top level
  const mainClubOptions = clubs;

  // All clubs that can serve as "extra" clubs (all clubs flattened)
  const allFlatClubs = clubs.reduce((acc, c) => {
    acc.push(c);
    if (c.sub_clubs) acc.push(...c.sub_clubs);
    return acc;
  }, []);

  const primaryClubIds = new Set(
    [selectedClub ? parseInt(selectedClub) : null, selectedSubClub ? parseInt(selectedSubClub) : null].filter(
      Boolean
    )
  );

  const extraClubOptions = allFlatClubs.filter((c) => !primaryClubIds.has(c.id));

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();

    const hasMainClub = u.club && u.club.name && u.club.name.toLowerCase().includes(query);
    const hasSubClub = u.sub_club && u.sub_club.name && u.sub_club.name.toLowerCase().includes(query);
    const hasExtraClub =
      u.extra_clubs && u.extra_clubs.some((c) => c.name && c.name.toLowerCase().includes(query));

    return (
      fullName.includes(query) ||
      (u.email && u.email.toLowerCase().includes(query)) ||
      (u.username && u.username.toLowerCase().includes(query)) ||
      hasMainClub ||
      hasSubClub ||
      hasExtraClub
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center p-4">
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-lg text-xs font-medium">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Administration
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Manage student club memberships, permissions, and affiliations
            </p>
          </div>

          <div className="inline-flex bg-slate-100 dark:bg-neutral-900 p-1 rounded-lg border border-slate-200 dark:border-neutral-800 self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'users'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Manage Users
            </button>
            <button
              onClick={() => setActiveTab('clubs')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                activeTab === 'clubs'
                  ? 'bg-white dark:bg-neutral-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Manage Clubs
            </button>
          </div>
        </div>

        {activeTab === 'users' ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Users &amp; Roles
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Assign club ownership and additional affiliations to verified members.
                </p>
              </div>
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
                  placeholder="Search users or clubs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-3 py-1.5 border border-slate-200 dark:border-neutral-700 rounded-lg leading-5 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors shadow-xs"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 shadow-xs overflow-hidden rounded-xl border border-slate-200 dark:border-neutral-800">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-neutral-800 text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-neutral-950/60 text-slate-600 dark:text-neutral-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="px-4 py-3 whitespace-nowrap">User</th>
                      <th className="px-4 py-3 whitespace-nowrap">Email</th>
                      <th className="px-4 py-3 whitespace-nowrap">Main Club</th>
                      <th className="px-4 py-3 whitespace-nowrap">Sub Club</th>
                      <th className="px-4 py-3 whitespace-nowrap">Additional Clubs</th>
                      <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 dark:divide-neutral-800/80 bg-white dark:bg-neutral-900">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-slate-500 dark:text-neutral-400">
                          No users found matching "{searchQuery}"
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {u.first_name} {u.last_name}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-neutral-500 font-mono">
                              @{u.username}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-neutral-300">
                            {u.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.club ? (
                              <span
                                className="px-2 py-0.5 inline-flex text-[11px] font-semibold rounded-md border"
                                style={{
                                  borderColor: u.club.color + '40',
                                  color: u.club.color,
                                  backgroundColor: u.club.color + '15',
                                }}
                              >
                                {u.club.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-neutral-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.sub_club ? (
                              <span
                                className="px-2 py-0.5 inline-flex text-[11px] font-semibold rounded-md border"
                                style={{
                                  borderColor: u.sub_club.color + '40',
                                  color: u.sub_club.color,
                                  backgroundColor: u.sub_club.color + '15',
                                }}
                              >
                                {u.sub_club.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-neutral-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.extra_clubs && u.extra_clubs.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {u.extra_clubs.map((ec) => (
                                  <span
                                    key={ec.id}
                                    className="px-2 py-0.5 inline-flex text-[11px] font-medium rounded-md border"
                                    style={{
                                      borderColor: ec.color + '40',
                                      color: ec.color,
                                      backgroundColor: ec.color + '15',
                                    }}
                                  >
                                    {ec.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-neutral-600">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-medium space-x-2">
                            <button
                              onClick={() => handleEditClick(u)}
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 transition-colors"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <ClubManagement />
        )}

        {activeTab === 'users' && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden transition-colors">
              <div className="p-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800 mb-5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Assign Roles
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono truncate max-w-[200px]">
                    {editingUser.email}
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Main Club */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                      Main Club
                    </label>
                    <select
                      value={selectedClub}
                      onChange={(e) => {
                        setSelectedClub(e.target.value);
                        setSelectedSubClub('');
                        if (e.target.value) {
                          setSelectedExtraClubs((prev) =>
                            prev.filter((id) => id !== parseInt(e.target.value))
                          );
                        }
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs"
                    >
                      <option value="">None (Viewer Only)</option>
                      {mainClubOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sub Club */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                      Sub Club
                    </label>
                    <select
                      value={selectedSubClub}
                      onChange={(e) => {
                        setSelectedSubClub(e.target.value);
                        if (e.target.value) {
                          setSelectedExtraClubs((prev) =>
                            prev.filter((id) => id !== parseInt(e.target.value))
                          );
                        }
                      }}
                      disabled={!selectedClub}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs disabled:opacity-50"
                    >
                      <option value="">None</option>
                      {subClubOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {!selectedClub && (
                      <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                        Assign a main club first to view sub-club options.
                      </p>
                    )}
                  </div>

                  {/* Additional Clubs */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                      Additional Clubs
                      <span className="ml-1.5 text-[11px] font-normal text-slate-400 dark:text-neutral-500">
                        (optional — multi-select)
                      </span>
                    </label>
                    {extraClubOptions.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-neutral-500 italic">
                        No other clubs available.
                      </p>
                    ) : (
                      <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50/50 dark:bg-neutral-950/40">
                        {extraClubOptions.map((c) => {
                          const checked = selectedExtraClubs.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                                checked
                                  ? 'bg-white dark:bg-neutral-800 shadow-xs'
                                  : 'hover:bg-slate-100 dark:hover:bg-neutral-800/60'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleExtraClub(c.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: c.color }}
                              />
                              <span className="text-xs text-slate-800 dark:text-neutral-200 font-medium">
                                {c.name}
                              </span>
                              {c.parent && (
                                <span className="text-[10px] text-slate-400 dark:text-neutral-500 ml-auto">
                                  sub-club
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {selectedExtraClubs.length > 0 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                        {selectedExtraClubs.length} additional club
                        {selectedExtraClubs.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 mt-5 border-t border-slate-100 dark:border-neutral-800">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 rounded-lg font-medium text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-xs transition-colors"
                  >
                    Save Changes
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
