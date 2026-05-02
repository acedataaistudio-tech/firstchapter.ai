import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Check, X, Search } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

export function StudentManagement({ institutionId }: { institutionId: string }) {
  const { user } = useUser();
  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    loadStudents();
  }, [institutionId, filter]);
  
  const loadStudents = async () => {
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`${API_BASE_URL}/api/institution/${institutionId}/students${statusParam}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async (studentId: string, studentName: string) => {
    if (!confirm(`Approve ${studentName}?`)) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          action: 'approve',
          admin_user_id: user?.id,
          admin_name: user?.fullName || 'Admin',
        }),
      });
      
      if (!res.ok) throw new Error('Approval failed');
      alert(`${studentName} approved!`);
      loadStudents();
    } catch (err) {
      alert('Failed to approve student');
    }
  };
  
  const handleReject = async (studentId: string, studentName: string) => {
    const reason = prompt(`Rejection reason for ${studentName}:`);
    if (!reason) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          action: 'reject',
          admin_user_id: user?.id,
          admin_name: user?.fullName || 'Admin',
          rejection_reason: reason,
        }),
      });
      
      if (!res.ok) throw new Error('Rejection failed');
      alert(`${studentName} rejected`);
      loadStudents();
    } catch (err) {
      alert('Failed to reject student');
    }
  };
  
  const filteredStudents = students.filter(student =>
    !searchTerm || 
    student.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search students..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #e5e4dc',
            borderRadius: '8px',
            marginBottom: '12px',
          }}
        />
        
        <div style={{ display: 'flex', gap: '8px' }}>
          {['all', 'pending', 'approved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                border: filter === f ? '1px solid #1D9E75' : '1px solid #e5e4dc',
                borderRadius: '8px',
                background: filter === f ? '#E1F5EE' : 'white',
                color: filter === f ? '#1D9E75' : '#888780',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div>Loading students...</div>
      ) : filteredStudents.length === 0 ? (
        <div>No students found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredStudents.map((student) => (
            <div key={student.id} style={{
              padding: '16px',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>{student.student_name}</div>
                <div style={{ fontSize: '13px', color: '#888780' }}>{student.student_email}</div>
              </div>
              
              {student.application_status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleApprove(student.id, student.student_name)}
                    style={{
                      padding: '8px 16px',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#1D9E75',
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(student.id, student.student_name)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#E74C3C',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              )}
              
              {student.application_status === 'approved' && (
                <div style={{ padding: '6px 12px', background: '#E1F5EE', color: '#1D9E75', borderRadius: '6px', fontSize: '12px' }}>
                  ✓ Approved
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
