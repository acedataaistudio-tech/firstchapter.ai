import { SignIn } from '@clerk/nextjs';

export default function InstitutionSignIn() {
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
          Institution Login
        </h1>
        <p style={{ fontSize: '16px', color: '#888780' }}>
          Sign in to manage your institution
        </p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-lg',
          },
        }}
        routing="path"
        path="/institution/sign-in"
        signUpUrl="/institution/sign-up"
        afterSignInUrl="/institution"
      />
    </div>
  );
}
