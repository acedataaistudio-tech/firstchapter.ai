import { SignUp } from "@clerk/nextjs";
import { useRouter } from "next/router";

export default function SignUpPage() {
  const router = useRouter();
  const role = router.query.role as string;

  // Determine where to go after signup based on role
  const afterSignUpUrl =
    role === "publisher"   ? "/publisher-onboarding" :
    role === "institution" ? "/institution" :
    "/reader-onboarding";  // default for readers

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
          {role === "publisher"   ? "Create your publisher account" :
           role === "institution" ? "Create your institution account" :
           "Start reading for free"}
        </p>
        <SignUp
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
          afterSignUpUrl={afterSignUpUrl}
        />
      </div>
    </div>
  );
}