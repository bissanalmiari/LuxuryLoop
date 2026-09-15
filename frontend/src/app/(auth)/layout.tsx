export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory px-8">
      <div className="w-[420px]">{children}</div>
    </div>
  );
}
