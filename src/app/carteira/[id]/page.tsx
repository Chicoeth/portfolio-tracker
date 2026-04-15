import { WalletPage } from "@/components/WalletPage";

export default async function CarteiraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <WalletPage walletId={id} />;
}
