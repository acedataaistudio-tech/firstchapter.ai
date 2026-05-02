import { SignUp } from '@clerk/nextjs';
import { useRouter } from 'next/router';

export default function InstitutionSignUp() {
  const router = useRouter();

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
        afterSignUpUrl="/institution/onboarding"
        unsafeMetadata={{
          userType: 'institution'
        }}
      />
    </div>
  );
}
