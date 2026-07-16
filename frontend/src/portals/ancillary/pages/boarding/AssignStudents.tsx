import React, { useState, useEffect } from 'react';
import api from '../../../../lib/api';

export default function AssignStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsRes, hostelsRes] = await Promise.all([
        api.get('/api/students'),
        api.get('/api/ancillary/hostels')
      ]);
      setStudents(studentsRes.data);
      setHostels(hostelsRes.data);
    } catch (error) {
      console.error('Failed to fetch data', error);
    
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/ancillary/boarding/assign', { studentId: selectedStudent, hostelId: selectedHostel });
      setSelectedStudent('');
      setSelectedHostel('');
      fetchData();
    } catch (error) {
      console.error('Failed to assign student', error);
    
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Assign / Transfer Students</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleAssign} className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
            <select
              required
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a student</option>
              {students.map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} ({student.studentId}) - Current: {student.hostel?.name || 'Day Scholar'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Target Hostel</label>
            <select
              required
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a dormitory</option>
              {hostels.map(hostel => (
                <option key={hostel.id} value={hostel.id}>
                  {hostel.name} ({hostel._count?.students || 0}/{hostel.capacity})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Assign Student
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Boarding Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hostel</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.filter(s => s.boardingStatus === 'Boarder').map((student) => (
              <tr key={student.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.studentId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    {student.boardingStatus}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {student.hostel?.name || 'Unassigned'}
                </td>
              </tr>
            ))}
            {students.filter(s => s.boardingStatus === 'Boarder').length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No boarders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
