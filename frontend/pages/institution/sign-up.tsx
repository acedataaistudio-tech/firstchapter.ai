import { SignUp } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

async function syncUserToDatabase(clerkUser: any, userType: 'reader' | 'institution') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/user/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clerk_user_id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        full_name: clerkUser.fullName || clerkUser.emailAddresses[0]?.emailAddress || '',
        user_type: userType,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Failed to sync user:', data);
      return false;
    }
    
    console.log('User synced successfully:', data);
    return true;
  } catch (error) {
    console.error('Error syncing user:', error);
    return false;
  }
}

export default function InstitutionSignUp() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      // User just signed up, sync to database
      syncUserToDatabase(user, 'institution');
    }
  }, [user, isLoaded]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f9f9f7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        marginBottom: '32px',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          Institution Signup
        </h1>
        <p style={{ fontSize: '16px', color: '#888780' }}>
          Create an account to manage your institution
        </p>
      </div>

      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
          },
        }}
        routing="path"
        path="/institution/sign-up"
        signInUrl="/institution/sign-in"
        afterSignUpUrl="/institution"
        unsafeMetadata={{
          userType: 'institution'
        }}
      />
    </div>
  );
}
