// components/StudentManagement.tsx

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Check, X, Clock, Search } from 'lucide-react';

export function StudentManagement({ institutionId }: { institutionId: string }) {
  const { user } = useUser();
  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved'
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadStudents();
  }, [institutionId, filter]);
  
  const loadStudents = async () => {
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`/api/institution/${institutionId}/students${statusParam}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApprove = async (studentId: string) => {
    try {
      const res = await fetch('/api/student/approve', {
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
      
      loadStudents(); // Reload
    } catch (err) {
      console.error('Approval failed:', err);
    }
  };
  
  const handleReject = async (studentId: string, reason: string) => {
    try {
      const res = await fetch('/api/student/approve', {
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
      
      loadStudents();
    } catch (err) {
      console.error('Rejection failed:', err);
    }
  };
  
  return (
    <div>
      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
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
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f}
          </button>
        ))}
      </div>
      
      {/* Student List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {students.map((student) => (
          <div
            key={student.id}
            style={{
              padding: '16px',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                {student.student_name}
              </div>
              <div style={{ fontSize: '13px', color: '#888780' }}>
                {student.student_email} • {student.department || 'No department'}
              </div>
              {student.student_roll_number && (
                <div style={{ fontSize: '12px', color: '#888780', marginTop: '2px' }}>
                  Roll: {student.student_roll_number}
                </div>
              )}
            </div>
            
            {student.application_status === 'pending' && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleApprove(student.id)}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#1D9E75',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  onClick={() => {
                    const reason = prompt('Rejection reason:');
                    if (reason) handleReject(student.id, reason);
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e5e4dc',
                    borderRadius: '6px',
                    background: 'white',
                    color: '#E74C3C',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <X size={14} /> Reject
                </button>
              </div>
            )}
            
            {student.application_status === 'approved' && (
              <div style={{
                padding: '6px 12px',
                background: '#E1F5EE',
                color: '#1D9E75',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
              }}>
                ✓ Approved
              </div>
            )}
            
            {student.application_status === 'rejected' && (
              <div style={{
                padding: '6px 12px',
                background: '#FEE',
                color: '#E74C3C',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
              }}>
                ✗ Rejected
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```
