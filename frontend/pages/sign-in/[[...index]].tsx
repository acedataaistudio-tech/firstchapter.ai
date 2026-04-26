import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/router";

export default function SignInPage() {
  const router = useRouter();
  const role = router.query.role as string;

  const afterSignInUrl =
    role === "publisher"   ? "/publisher" :
    role === "institution" ? "/institution" :
    "/";  // readers go to platform

  const subtitle =
    role === "publisher"   ? "Sign in to your publisher account" :
    role === "institution" ? "Sign in to your institution account" :
    "Sign in to continue reading";

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f9f9f7",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "28px",
          marginBottom: "8px",
          color: "#2C2C2A",
        }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
        </h1>
        <p style={{
          fontSize: "14px",
          color: "#888780",
          marginBottom: "32px",
        }}>
          {subtitle}
        </p>
        <SignIn
          appearance={{
            elements: {
              card: {
                boxShadow: "none",
                border: "0.5px solid #e5e4dc",
                borderRadius: "16px",
              },
              primaryButton: {
                backgroundColor: "#1D9E75",
                borderRadius: "100px",
              },
            }
          }}
          afterSignInUrl={afterSignInUrl}
        />
      </div>
    </div>
  );
}