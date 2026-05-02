// Add this to your institution sign-up page
// Call this function after Clerk signup completes

const API_BASE_URL = 'https://firstchapterai-production.up.railway.app';

export async function syncUserToDatabase(clerkUser: any, userType: 'reader' | 'institution') {
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

// USAGE EXAMPLE:
// In your institution sign-up page, after Clerk completes:

/*
import { SignUp } from '@clerk/nextjs';
import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { syncUserToDatabase } from '../utils/userSync';

export default function InstitutionSignUp() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      // User just signed up, sync to database
      syncUserToDatabase(user, 'institution');
    }
  }, [user, isLoaded]);

  return <SignUp ... />;
}
*/
