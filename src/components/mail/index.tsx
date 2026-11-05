import type React from "react";
import { Container, Html, pixelBasedPreset, Tailwind } from "react-email";
export const TailwindWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <Tailwind
      config={{
        presets: [pixelBasedPreset],
        theme: {
          extend: {
            colors: {
              brand: "#007291",
            },
          },
        },
      }}
    >
      {children}
    </Tailwind>
  );
};

export const SendVerificationEmail = ({ url }: { url: string }) => {
  console.log(url);
  return (
    <TailwindWrapper>
      <Html lang="en">
        <Container></Container>
      </Html>
    </TailwindWrapper>
  );
};
