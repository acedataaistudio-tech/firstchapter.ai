import { useRouter } from "next/router";
import { useEffect } from "react";

export default function InstitutionSignup() {
  const router = useRouter();
  
  useEffect(() => {
    router.push("/institution/sign-up");
  }, [router]);
  
  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "#f9f9f7", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      fontFamily: "'DM Sans', sans-serif" 
    }}>
      <p style={{ fontSize: "14px", color: "#888780" }}>
        Redirecting to institution signup...
      </p>
    </div>
  );
}
