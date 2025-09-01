import { Outfit } from "next/font/google";
import "./globals.css";
import "swiper/swiper-bundle.css";
import "simplebar-react/dist/simplebar.min.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import GlobalLoader from "@/components/common/GlobalLoader";
import { PostHogProvider } from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.className} dark:bg-gray-900`}
        suppressHydrationWarning={true}
      >
        <PostHogProvider>
          <ThemeProvider>
            <AuthProvider>
              <SidebarProvider>
                <GlobalLoader />
                {children}
              </SidebarProvider>
            </AuthProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
