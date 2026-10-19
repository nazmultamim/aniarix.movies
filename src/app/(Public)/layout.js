import Navbar from "@/components/ui/Navbar.home";
import PwaRegister from "@/components/pwa/PwaRegister";
import { getCanonicalUrl, siteConfig } from "@/lib/site-config";
import Footer from "@/components/ui/Footer";

export async function generateMetadata() {
  const siteName = siteConfig.name;
  const description = siteConfig.description;

  return {
    metadataBase: new URL(getCanonicalUrl('/')),
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    keywords: siteConfig.keywords,
  };
}

export default function MainLayout({ children }) {
  return (
    <>
      <Navbar />
      <PwaRegister />
      {children}
      <Footer />
    </>
  );
}
