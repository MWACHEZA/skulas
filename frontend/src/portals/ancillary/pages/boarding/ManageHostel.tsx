import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export default function ManageHostel() {
  const [hostels, setHostels] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', categoryId: '', roomId: '', capacity: '', location: '', description: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [hostelsRes, categoriesRes, roomsRes] = await Promise.all([
        api.get('/ancillary/hostels'),
        api.get('/ancillary/hostel-categories'),
        api.get('/ancillary/hostel-rooms')
      ]);
      setHostels(hostelsRes.data);
      setCategories(categoriesRes.data);
      setRooms(roomsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/ancillary/hostels', formData);
      setShowModal(false);
      setFormData({ name: '', categoryId: '', roomId: '', capacity: '', location: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to create hostel', error);
    
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this hostel?')) return;
    try {
      await api.delete(`/ancillary/hostels/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete hostel', error);
    
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Manage Dormitory</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i className="fas fa-plus mr-2"></i> Add Hostel
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hostel Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Occupancy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {hostels.map((hostel) => (
              <tr key={hostel.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{hostel.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hostel.category?.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hostel.roomType?.name} ({hostel.roomType?.type})</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hostel.capacity}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hostel._count?.students || 0}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{hostel.location}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleDelete(hostel.id)} className="text-red-600 hover:text-red-900">
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
            {hostels.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">No dormitories found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4">Add Hostel</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hostel Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Category</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Room</label>
                  <select
                    required
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Room</option>
                    {rooms.map(room => (
                      <option key={room.id} value={room.id}>{room.name} ({room.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
