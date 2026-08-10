import { FormularioDeEntrada } from "./formulario";

export default function PaginaDeEntrada() {
  return (
    <main className="pagina">
      <div className="marca">
        jurii<span className="ouro">.</span>
      </div>
      <h1>O Jurii no seu computador</h1>
      <p className="subtitulo">
        Mensagens, casos e a gestão do escritório, com a mesma conta do
        aplicativo. Feito para o dia de trabalho de advogados e escritórios;
        clientes também entram por aqui.
      </p>
      <div className="cartao">
        <FormularioDeEntrada />
      </div>
    </main>
  );
}
