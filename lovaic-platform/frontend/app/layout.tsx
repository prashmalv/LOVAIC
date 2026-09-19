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
    <html lang="en" className="h-full antialiased">
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
