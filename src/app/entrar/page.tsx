import { FormularioDeEntrada } from "./formulario";

export default function PaginaDeEntrada() {
  return (
    <main className="pagina">
      <div className="marca">
        jurii<span className="ouro">.</span>
      </div>
      <h1>Área do escritório</h1>
      <p className="subtitulo">
        Entre com a mesma conta do aplicativo para gerenciar o plano do seu
        escritório.
      </p>
      <div className="cartao">
        <FormularioDeEntrada />
      </div>
    </main>
  );
}
