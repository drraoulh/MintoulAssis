/** Bottom line shared by the tourism and cinema footers. */
export function FooterSignature({ brand, accent }: { brand: string; accent: string }) {
  return (
    <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/45 md:px-6">
      © {new Date().getFullYear()} {brand}
      <span className="mx-2 text-white/25" aria-hidden>
        ·
      </span>
      <span className="text-white/65">
        Developed by{' '}
        <span className="font-semibold tracking-wide" style={{ color: accent }}>
          ACL CONNEXT
        </span>
      </span>
    </div>
  );
}
