import { PackageSelector } from '../components/PackageSelector';
import { useRouter } from 'next/router';
import { useUser } from '@clerk/nextjs';

export default function PricingPage() {
  const router = useRouter();
  const { user } = useUser();

  const handlePackageSelect = async (pkg: any) => {
    console.log('Selected package:', pkg);
    
    // Save package selection
    try {
      await user?.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          selectedPackage: pkg.id,
          packageName: pkg.name,
        }
      });
    } catch (e) {
      console.error('Error saving package:', e);
    }
    
    // Redirect to checkout or payment
    // For now, redirect to reader page
    router.push('/reader');
    
    // TODO: Integrate with Razorpay
    // router.push(`/checkout?package=${pkg.id}`);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f9f9f7",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "white",
        borderBottom: "0.5px solid #e5e4dc",
        padding: "16px 32px",
      }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: "24px",
          color: "#2C2C2A",
          margin: 0,
        }}>
          First<span style={{ color: "#1D9E75" }}>chapter</span>
        </h1>
      </div>

      {/* Package Selector */}
      <PackageSelector
        userType="individual"
        onSelect={handlePackageSelect}
      />

      {/* Footer note */}
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "32px 24px",
        textAlign: "center",
      }}>
        <p style={{ fontSize: "13px", color: "#888780" }}>
          Need help choosing? <a href="/contact" style={{ color: "#1D9E75", textDecoration: "none" }}>Contact us</a>
        </p>
      </div>
    </div>
  );
}
