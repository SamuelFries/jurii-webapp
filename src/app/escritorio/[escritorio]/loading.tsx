/**
 * O esqueleto que aparece ENQUANTO o servidor trabalha.
 *
 * Sem ele, clicar num item da lateral não devolve nada até a resposta
 * chegar: a tela antiga fica parada e a pessoa não sabe se o clique
 * pegou. Com ele, a resposta é imediata e o conteúdo entra por cima.
 *
 * Como a casca agora vive no layout, isto substitui SÓ o miolo: a barra
 * lateral não pisca.
 */
export default function CarregandoTelaDeTrabalho() {
  return (
    <div className="pagina-de-trabalho" aria-busy>
      <div className="miolo">
        <span className="so-para-leitores">Carregando</span>
        <div className="esqueleto titulo" />
        <div className="esqueleto linha" style={{ width: "62%" }} />
        <div className="lista-empilhada" style={{ marginTop: 18 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="cartao-de-lista esqueleto-cartao">
              <span className="esqueleto avatar-falso" />
              <span className="conteudo">
                <span
                  className="esqueleto linha"
                  style={{ width: `${58 - i * 6}%` }}
                />
                <span
                  className="esqueleto linha curta"
                  style={{ width: `${74 - i * 5}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
