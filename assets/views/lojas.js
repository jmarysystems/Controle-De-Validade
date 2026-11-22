// Escolha do estabelecimento (loja).
import { listar } from '../api.js?v=20261122a';
import * as ui from '../ui.js?v=20261122a';

export async function render(raiz, ctx) {
  ctx.setTitulo('Estabelecimentos');

  const lojas = await listar('arm_lojas', { ordem: 'nome' });

  raiz.innerHTML = `
    <div class="cartao">
      <h2>Escolha o estabelecimento</h2>
      ${lojas.length ? `<div class="tabela-rolagem"><table>
        <thead><tr><th>Estabelecimento</th><th></th></tr></thead>
        <tbody>
          ${lojas.map((l) => `<tr>
            <td>${ui.esc(l.nome)}${l.nome_fantasia && l.nome_fantasia !== l.nome
              ? ` <span class="sub">(${ui.esc(l.nome_fantasia)})</span>` : ''}</td>
            <td class="acoes">
              <a class="botao-pequeno" href="#/lancar/${encodeURIComponent(l.id)}">Lançar</a>
              <a class="botao-pequeno" href="#/lista/${encodeURIComponent(l.id)}">Ver controle</a>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>` : ui.vazio('Nenhum estabelecimento cadastrado.')}
    </div>`;
}
