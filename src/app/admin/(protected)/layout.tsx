import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen">
      {/* Admin header bar */}
      <div className="bg-surface-2 border-b border-surface-3 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-brand-400 bg-brand-500/10 px-2 py-1 rounded">
            ADMIN
          </span>
          <span className="text-sm text-gray-400">Gerenciamento de Carteiras</span>
        </div>
        <a
          href="/api/auth/signout"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Sair
        </a>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
