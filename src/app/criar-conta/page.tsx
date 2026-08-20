import { caminhoInterno } from "@/lib/caminho-seguro";
import Image from "next/image";
import Link from "next/link";

import { Aurora } from "../entrar/aurora";

import { FormularioDeCadastro } from "./formulario";

/** O cadastro espelha o RegisterScreen do app: mesmos campos, mesmas
 * validações (nome e sobrenome, CPF com dígito verificador, senha de 8),
 * mesmo signUp com full_name e cpf nos metadados, que é o que o gatilho do
 * banco usa para criar o perfil. */
export default async function PaginaDeCadastro({
  searchParams,
}: {
  searchParams: Promise<{ depois?: string }>;
}) {
  const { depois } = await searchParams;
  const destino = caminhoInterno(depois, "/");
  return (
    <div className="tela-de-entrada solo">
      <Aurora />
      <main className="cartao-de-entrada">
        <h1 className="so-para-leitores">Criar conta no Jurii</h1>
        <Image
          src="/marca/jurii-lockup-empilhado-claro.png"
          alt="Jurii"
          width={666}
          height={666}
          priority
          className="lockup-da-entrada lockup-claro"
        />
        <Image
          src="/marca/jurii-lockup-empilhado-escuro.png"
          alt=""
          aria-hidden
          width={666}
          height={666}
          priority
          className="lockup-da-entrada lockup-escuro"
        />
        <p className="subtitulo subtitulo-da-entrada">
          Crie sua conta de advogado ou escritório. A conta vale aqui e no
          aplicativo; a mesa de trabalho abre depois que a Jurii verifica
          sua OAB.
        </p>
        <FormularioDeCadastro depois={destino} />
        <p className="detalhe" style={{ marginTop: 14 }}>
          Já tem conta? <Link href="/entrar">Entrar</Link>
        </p>
      </main>
    </div>
  );
}
