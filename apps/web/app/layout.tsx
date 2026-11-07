import React from "react";

export const metadata = {
  title: "AETHER — The Distributed Sovereign Agent OS",
  description:
    "Deterministic execution fabric, sovereign memory runtime, and zero-trust sandboxes for autonomous AI swarms.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
          backgroundColor: "#090d16",
          color: "#f1f5f9",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
