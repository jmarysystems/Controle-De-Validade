// Dashboard do Controle de Validade.
import { listar } from '../api.js?v=20261122a';
import * as ui from '../ui.js?v=20261122a';

const diasAte = (data) => {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo - hoje) / 86400000);
};

export async function render(raiz, ctx) {
  ctx.setTitulo('Dashboard');

  const [itens, lojas] = await Promise.all([
    listar('val_itens', { ordem: 'data_vencimento' }),
    listar('arm_lojas', { ordem: 'nome' }),
  ]);

  const porLoja = new Map();
  let vencidos = 0;
  let vencendo = 0;
  let aguardando = 0;

  for (const item of itens) {
    const dias = diasAte(item.data_vencimento);
    const chave = item.loja_id || 'sem';
    const atual = porLoja.get(chave) || { itens: 0, vencidos: 0, vencendo: 0 };
    atual.itens += 1;
    porLoja.set(chave, atual);

    if (dias !== null && dias < 0) { vencidos += 1; atual.vencidos += 1; }
    else if (dias !== null && dias <= 30) { vencendo += 1; atual.vencendo += 1; }
    if (item.status === 'aguardando') aguardando += 1;
  }

  const nomeLoja = new Map(lojas.map((l) => [l.id, l.nome]));

  const linhas = [...porLoja.entries()]
    .map(([id, d]) => ({ nome: nomeLoja.get(id) || 'Sem loja', ...d }))
    .sort((a, b) => b.itens - a.itens)
    .map((d) => `<tr>
      <td>${ui.esc(d.nome)}</td>
      <td class="num">${ui.num(d.itens, 0)}</td>
      <td class="num">${ui.num(d.vencendo, 0)}</td>
      <td class="num">${ui.num(d.vencidos, 0)}</td>
    </tr>`).join('');

  raiz.innerHTML = `
    <div class="kpis">
      <div class="kpi">
        <div class="rotulo">No controle</div>
        <div class="valor">${ui.num(itens.length, 0)}</div>
        <div class="detalhe">produtos sinalizados</div>
      </div>
      <div class="kpi">
        <div class="rotulo">Vencendo em 30 dias</div>
        <div class="valor">${ui.num(vencendo, 0)}</div>
        <div class="detalhe">atenção do comercial</div>
      </div>
      <div class="kpi">
        <div class="rotulo">Vencidos</div>
        <div class="valor" style="color:#b3261e">${ui.num(vencidos, 0)}</div>
        <div class="detalhe">prazo passou</div>
      </div>
      <div class="kpi">
        <div class="rotulo">Aguardando retorno</div>
        <div class="valor">${ui.num(aguardando, 0)}</div>
        <div class="detalhe">sem resposta do comercial</div>
      </div>
    </div>

    <div class="cartao">
      <h2>Por estabelecimento</h2>
      ${porLoja.size ? `<div class="tabela-rolagem"><table>
        <thead><tr><th>Estabelecimento</th><th class="num">Itens</th>
          <th class="num">Vencendo</th><th class="num">Vencidos</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table></div>` : ui.vazio('Nenhum produto no controle de validade ainda.')}
    </div>`;
}
