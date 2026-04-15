import prisma from "@/lib/prisma";
import { WalletPage } from "@/components/WalletPage";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const mainWallet = await prisma.wallet.findFirst({
    where: { category: "main" },
    select: { id: true },
  });

  if (!mainWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-gray-300 mb-2">
            Nenhuma carteira principal configurada
          </h1>
          <p className="text-sm text-gray-500">
            Acesse o painel admin para criar a Carteira Paradigma.
          </p>
        </div>
      </div>
    );
  }

  return <WalletPage walletId={mainWallet.id} />;
}
