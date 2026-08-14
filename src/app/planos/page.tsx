import Link from "next/link";
import { redirect } from "next/navigation";

import { MioloDePlanos } from "@/components/planos/miolo-de-planos";
import { contextoLogado } from "@/lib/contexto";
import { escritorioDoSocio } from "@/lib/fluxos";

export const dynamic = "force-dynamic";

/**
 * O FUNIL DE COMPRA, para quem ainda não tem escritório.
 *
 * Esta tela mora FORA de `/escritorio/{id}` de propósito, e a razão é
 * simples: a licença vem antes da banca. O contratante escolhe o plano, a
 * licença destrava o cadastro (a policy de law_firm_verifications exige
 * has_law_firm_license), e só depois da verificação existe um escritório
 * com id. Enquanto isso não acontece não há id nenhum para pôr na rota, e
 * uma tela de planos dentro do segmento seria inalcançável justamente para
 * quem precisa dela.
 *
 * QUEM É DESVIADO DAQUI é quem já é SÓCIO de uma banca, e não quem tem
 * vínculo: essa pessoa já tem uma assinatura, e trocar de plano é na tela do
 * escritório dela, que sabe de qual banca está falando. Estagiária,
 * secretária e advogado de um escritório alheio continuam vendo esta tela,
 * porque a licença deles ainda não existe: é a primeira, a que destrava o
 * cadastro da banca própria.
 */
export default async function PlanosDaPrimeiraLicenca({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const contexto = await contextoLogado();
  const minhaBanca = escritorioDoSocio(contexto.fluxos);
  if (minhaBanca !== null) redirect(`/escritorio/${minhaBanca.id}/planos`);

  return (
    <main className="pagina">
      <Link href="/" className="marca marca-pequena">
        jurii<span className="ouro">.</span>
      </Link>
      <MioloDePlanos
        supabase={contexto.supabase}
        escritorioId={null}
        erro={erro}
      />
    </main>
  );
}
