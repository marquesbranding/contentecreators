import { Montserrat, Nunito, Playfair_Display } from "next/font/google";

const serif = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-sponsor-serif",
});
const display = Montserrat({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-sponsor-display",
});
const rounded = Nunito({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-sponsor-rounded",
});
export const sponsorshipFontVariables = `${serif.variable} ${display.variable} ${rounded.variable}`;
