import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { AddStudentsModal } from './AddStudentsModal';
import { Check, X, Search, Calendar, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

// ══════════════════════════════════════════════════════════════════
// Validity period options shown in the approval modal
// ══════════════════════════════════════════════════════════════════
const VALIDITY_OPTIONS: { label: string; value: number | null }[] = [
  { label: '1 year',  value: 1 },
  { label: '2 years', value: 2 },
  { label: '3 years', value: 3 },
  { label: '4 years', value: 4 },
  { label: '5 years', value: 5 },
  { label: 'Lifetime (no expiry)', value: null },
];

// ══════════════════════════════════════════════════════════════════
// APPROVE MODAL — admin picks validity period before confirming
// ══════════════════════════════════════════════════════════════════
function ApproveModal({
  student,
  onClose,
  onConfirm,
  submitting,
}: {
  student: any;
  onClose: () => void;
  onConfirm: (validityYears: number | null) => void;
  submitting: boolean;
}) {
  
 const [validityYears, setValidityYears] = useState<number | null>(2); // default 2 years

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Approve Student
        </h2>
        <p style={{ fontSize: '14px', color: '#888780', marginBottom: '20px' }}>
          Approve <strong>{student.student_name}</strong> ({student.student_email})
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>
            <Calendar size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Access Validity
          </label>
          <select
            value={validityYears === null ? 'null' : validityYears}
            onChange={(e) => {
              const v = e.target.value;
              setValidityYears(v === 'null' ? null : parseInt(v, 10));
            }}
            style={inputStyle}
            disabled={submitting}
          >
            {VALIDITY_OPTIONS.map((opt) => (
              <option key={String(opt.value)} value={opt.value === null ? 'null' : opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '12px', color: '#888780', marginTop: '6px' }}>
            {validityYears === null
              ? 'Student will have access indefinitely.'
              : `Student access will expire on ${formatExpiryDate(validityYears)} and the account will be auto-deactivated.`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={submitting} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(validityYears)}
            disabled={submitting}
            style={{ ...primaryButtonStyle, opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? 'Approving...' : 'Confirm Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// REJECT MODAL — admin enters rejection reason
// ══════════════════════════════════════════════════════════════════
function RejectModal({
  student,
  onClose,
  onConfirm,
  submitting,
}: {
  student: any;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  submitting: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Reject Application
        </h2>
        <p style={{ fontSize: '14px', color: '#888780', marginBottom: '20px' }}>
          Reject <strong>{student.student_name}</strong>'s application?
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Rejection Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Roll number could not be verified against records"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            disabled={submitting}
          />
          <p style={{ fontSize: '12px', color: '#888780', marginTop: '6px' }}>
            This reason will be visible to the student.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={submitting} style={secondaryButtonStyle}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={submitting || !reason.trim()}
            style={{
              ...primaryButtonStyle,
              background: '#E74C3C',
              opacity: submitting || !reason.trim() ? 0.6 : 1,
            }}
          >
            {submitting ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════
export function StudentManagement({ institutionId }: { institutionId: string }) {
  const { user, isLoaded: userLoaded } = useUser();
  const [students, setStudents] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [approvingStudent, setApprovingStudent] = useState<any>(null);
  const [rejectingStudent, setRejectingStudent] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Toast/banner state for success/error feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showAddStudents, setShowAddStudents] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [institutionId, filter]);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadStudents = async () => {
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';
      const res = await fetch(`${API_BASE_URL}/api/institution/${institutionId}/students${statusParam}`);
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err) {
      console.error('Failed to load students:', err);
      setToast({ type: 'error', message: 'Failed to load students' });
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  // ✅ FIX: Properly extract backend error detail
  // ════════════════════════════════════════════════════════════
  const performApprovalAction = async (
    payload: Record<string, any>,
    successMessage: string
  ) => {
    if (!userLoaded || !user?.id) {
      setToast({ type: 'error', message: 'Please wait — user info is still loading.' });
      return false;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/student/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          admin_user_id: user.id,
          admin_name: user.fullName || 'Institution Admin',
        }),
      });

      // ✅ Read body whether OK or not — backend returns useful errors in detail
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const detail = data?.detail || `Request failed with status ${res.status}`;
        console.error('Approval action failed:', detail, data);
        throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      }

      setToast({ type: 'success', message: successMessage });
      await loadStudents();
      return true;
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Action failed' });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveConfirm = async (validityYears: number | null) => {
    if (!approvingStudent) return;
    const ok = await performApprovalAction(
      {
        student_id: approvingStudent.id,
        action: 'approve',
        validity_years: validityYears,
      },
      `${approvingStudent.student_name} approved${
        validityYears ? ` for ${validityYears} year${validityYears > 1 ? 's' : ''}` : ''
      }!`
    );
    if (ok) setApprovingStudent(null);
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectingStudent || !reason) return;
    const ok = await performApprovalAction(
      {
        student_id: rejectingStudent.id,
        action: 'reject',
        rejection_reason: reason,
      },
      `${rejectingStudent.student_name}'s application rejected.`
    );
    if (ok) setRejectingStudent(null);
  };

  const filteredStudents = students.filter(
    (student) =>
      !searchTerm ||
      student.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            background: toast.type === 'success' ? '#E1F5EE' : '#FDEDEC',
            border: `1px solid ${toast.type === 'success' ? '#1D9E75' : '#E74C3C'}`,
            color: toast.type === 'success' ? '#1D9E75' : '#C0392B',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            zIndex: 1000,
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          {toast.type === 'success' ? <Check size={16} style={{ marginTop: '2px' }} /> : <AlertCircle size={16} style={{ marginTop: '2px' }} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Search + Filter bar */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888780' }} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              border: '1px solid #e5e4dc',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {['all', 'pending', 'approved', 'rejected'].map((f) => (
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
                fontSize: '13px',
              }}
            >
              {f}
            </button>
          ))}

          {/* + Add students — pushes to the right */}
          <button
            onClick={() => setShowAddStudents(true)}
            style={{
              marginLeft: 'auto',
              padding: '8px 18px',
              border: 'none',
              borderRadius: '100px',
              background: '#1D9E75',
              color: 'white',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            + Add students
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>Loading students...</div>
      ) : filteredStudents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888780' }}>No students found</div>
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
                gap: '12px',
                opacity: student.is_expired ? 0.6 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: '600' }}>{student.student_name}</div>
                <div style={{ fontSize: '13px', color: '#888780' }}>{student.student_email}</div>

                {/* Verification panel — emphasized for PENDING applications */}
                {student.application_status === 'pending' && (student.student_roll_number || student.year_of_admission) && (
                  <div style={{
                    background: '#FFFBEC',
                    border: '1px solid #FFE4A3',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#8B6914',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px 16px',
                  }}>
                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, width: '100%', marginBottom: '2px', color: '#B8860B' }}>
                      Verify against your records
                    </div>
                    {student.student_roll_number && (
                      <span><strong>Roll #:</strong> {student.student_roll_number}</span>
                    )}
                    {student.year_of_admission && (
                      <span><strong>Year of admission:</strong> {student.year_of_admission}</span>
                    )}
                    {student.student_department && (
                      <span><strong>Dept:</strong> {student.student_department}</span>
                    )}
                  </div>
                )}

                {/* Compact display for approved/rejected (less prominent) */}
                {student.application_status !== 'pending' && (student.student_roll_number || student.student_department || student.year_of_admission) && (
                  <div style={{ fontSize: '12px', color: '#888780', marginTop: '4px' }}>
                    {student.student_roll_number && <span>Roll: {student.student_roll_number}</span>}
                    {student.student_roll_number && student.year_of_admission && <span> · </span>}
                    {student.year_of_admission && <span>Joined: {student.year_of_admission}</span>}
                    {(student.student_roll_number || student.year_of_admission) && student.student_department && <span> · </span>}
                    {student.student_department && <span>{student.student_department}</span>}
                  </div>
                )}

                {/* Expiry info for approved students */}
                {student.application_status === 'approved' && student.access_expires_at && (
                  <div style={{ fontSize: '12px', color: student.is_expired ? '#E74C3C' : '#888780', marginTop: '4px' }}>
                    {student.is_expired
                      ? `⚠ Expired on ${new Date(student.access_expires_at).toLocaleDateString()}`
                      : `Access expires ${new Date(student.access_expires_at).toLocaleDateString()}`}
                  </div>
                )}

                {/* Rejection reason for rejected students */}
                {student.application_status === 'rejected' && student.rejection_reason && (
                  <div style={{ fontSize: '12px', color: '#C0392B', marginTop: '4px', fontStyle: 'italic' }}>
                    Reason: {student.rejection_reason}
                  </div>
                )}
              </div>

              {/* Actions / status badges */}
              {student.application_status === 'pending' && (
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => setApprovingStudent(student)}
                    style={{
                      padding: '8px 14px',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#1D9E75',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <Check size={14} /> Approve
                  </button>
                  <button
                    onClick={() => setRejectingStudent(student)}
                    style={{
                      padding: '8px 14px',
                      border: '1px solid #e5e4dc',
                      borderRadius: '6px',
                      background: 'white',
                      color: '#E74C3C',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                    }}
                  >
                    <X size={14} /> Reject
                  </button>
                </div>
              )}

              {student.application_status === 'approved' && !student.is_expired && (
                <div style={{ padding: '6px 12px', background: '#E1F5EE', color: '#1D9E75', borderRadius: '6px', fontSize: '12px', flexShrink: 0 }}>
                  ✓ Approved
                </div>
              )}

              {student.application_status === 'approved' && student.is_expired && (
                <div style={{ padding: '6px 12px', background: '#FDEDEC', color: '#C0392B', borderRadius: '6px', fontSize: '12px', flexShrink: 0 }}>
                  Expired
                </div>
              )}

              {student.application_status === 'rejected' && (
                <div style={{ padding: '6px 12px', background: '#FDEDEC', color: '#C0392B', borderRadius: '6px', fontSize: '12px', flexShrink: 0 }}>
                  ✕ Rejected
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {approvingStudent && (
        <ApproveModal
          student={approvingStudent}
          onClose={() => !submitting && setApprovingStudent(null)}
          onConfirm={handleApproveConfirm}
          submitting={submitting}
        />
      )}
      {rejectingStudent && (
        <RejectModal
          student={rejectingStudent}
          onClose={() => !submitting && setRejectingStudent(null)}
          onConfirm={handleRejectConfirm}
          submitting={submitting}
        />
      )}

      {/* Bulk / single invite modal */}
      {showAddStudents && userLoaded && user && (
        <AddStudentsModal
          institutionId={institutionId}
          adminUserId={user.id}
          onClose={() => setShowAddStudents(false)}
          onComplete={() => loadStudents()}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// Helpers and shared styles
// ══════════════════════════════════════════════════════════════════

function formatExpiryDate(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toLocaleDateString();
}

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1100,
  padding: '24px',
};

const modalCardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '16px',
  padding: '28px',
  maxWidth: '480px',
  width: '100%',
  border: '1px solid #e5e4dc',
  boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#444',
  marginBottom: '8px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e4dc',
  borderRadius: '8px',
  fontSize: '14px',
  boxSizing: 'border-box',
  background: 'white',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: '8px',
  background: '#1D9E75',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '10px 20px',
  border: '1px solid #e5e4dc',
  borderRadius: '8px',
  background: 'white',
  color: '#888780',
  cursor: 'pointer',
  fontSize: '14px',
};
