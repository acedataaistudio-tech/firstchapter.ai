import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Check, X, Clock, Search, Download } from 'lucide-react';

interface StudentManagementProps {
  institutionId: string;
}

export function StudentManagement({ institutionId }: StudentManagementProps) {
  const { user } = useUser();
  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  const handleApprove = async (studentId: string, studentName: string) => {
    if (!confirm(`Approve ${studentName}?`)) return;
    
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
      
      alert(`${studentName} has been approved!`);
      loadStudents(); // Reload
    } catch (err) {
      console.error('Approval failed:', err);
      alert('Failed to approve student. Please try again.');
    }
  };
  
  const handleReject = async (studentId: string, studentName: string) => {
    const reason = prompt(`Rejection reason for ${studentName}:`);
    if (!reason) return;
    
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
      
      alert(`${studentName} application has been rejected.`);
      loadStudents();
    } catch (err) {
      console.error('Rejection failed:', err);
      alert('Failed to reject student. Please try again.');
    }
  };
  
  const filteredStudents = students.filter(student => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      student.student_name?.toLowerCase().includes(search) ||
      student.student_email?.toLowerCase().includes(search) ||
      student.student_roll_number?.toLowerCase().includes(search) ||
      student.department?.toLowerCase().includes(search)
    );
  });
  
  return (
    <div>
      {/* Search & Filter */}
      <div style={{ marginBottom: '24px' }}>
        {/* Search */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#888780',
          }} />
          <input
            type="text"
            placeholder="Search students by name, email, roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
        </div>
        
        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: 'All Students' },
            { id: 'pending', label: 'Pending' },
            { id: 'approved', label: 'Approved' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '8px 16px',
                border: filter === f.id ? '1px solid #1D9E75' : '1px solid #e5e4dc',
                borderRadius: '8px',
                background: filter === f.id ? '#E1F5EE' : 'white',
                color: filter === f.id ? '#1D9E75' : '#888780',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Student List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>
          Loading students...
        </div>
      ) : filteredStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>
          {searchTerm ? 'No students found matching your search.' : 'No students yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              style={{
                padding: '16px',
                border: '1px solid #e5e4dc',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'white',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                  {student.student_name}
                </div>
                <div style={{ fontSize: '13px', color: '#888780' }}>
                  {student.student_email}
                  {student.department && ` • ${student.department}`}
                  {student.course && ` • ${student.course}`}
                </div>
                {student.student_roll_number && (
                  <div style={{ fontSize: '12px', color: '#888780', marginTop: '2px' }}>
                    Roll: {student.student_roll_number}
                  </div>
                )}
                {student.application_submitted_at && (
                  <div style={{ fontSize: '11px', color: '#AAA9A0', marginTop: '4px' }}>
                    Applied: {new Date(student.application_submitted_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {student.application_status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(student.id, student.student_name)}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#1D9E75',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
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
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <X size={14} /> Reject
                    </button>
                  </>
                )}
                
                {student.application_status === 'approved' && (
                  <div style={{
                    padding: '6px 12px',
                    background: '#E1F5EE',
                    color: '#1D9E75',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Check size={14} /> Approved
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <X size={14} /> Rejected
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
