import type { AppProps } from "next/app";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: "#1D9E75",
          borderRadius: "12px",
          fontFamily: "'DM Sans', sans-serif",
        }
      }}
    >
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontSize: "13px",
            borderRadius: "12px",
            border: "0.5px solid #e5e7eb",
          },
        }}
      />
    </ClerkProvider>
  );
}