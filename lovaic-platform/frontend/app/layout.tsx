import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOVAIC — Vision Intelligence Platform",
  description:
    "One vision engine, many missions. Real-time computer vision for smart cities and enterprise — garbage & waste, traffic, safety, lost & found, retail intelligence and more.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline theme script below sets data-theme
    // before React hydrates, so the server/client attribute diff is expected.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Apply the saved theme before paint to avoid a flash. Default: dark. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('lovaic-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
