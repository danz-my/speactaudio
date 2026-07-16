import "./fonts.css";
import "./globals.css";

export const metadata = {
  title: "Audio's Speact — Audio Spectrum Video Generator",
  description:
    "Ubah audio jadi video visualizer yang bergerak sesuai ketukan musik. Pilih template, atur gambar tengah, overlay, teks, lalu rekam sebagai video."
};

export const viewport = {
  themeColor: "#1b1a17"
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
