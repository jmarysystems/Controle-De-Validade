// Produtos no controle de validade.
import { listar, atualizar, excluir } from '../api.js?v=20261122a';
import * as ui from '../ui.js?v=20261122a';

const diasAte = (data) => {
  if (!data) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${data}T00:00:00`);
  return Math.round((alvo - hoje) / 86400000);
};

const situacao = (item) => {
  const dias = diasAte(item.data_vencimento);
  if (dias === null) return { texto: '—', cor: 'neutro' };
  if (dias < 0) return { texto: `vencido há ${Math.abs(dias)}d`, cor: 'vermelho' };
  if (dias === 0) return { texto: 'vence hoje', cor: 'laranja' };
  if (dias <= 30) return { texto: `${dias}d`, cor: 'amarelo' };
  return { texto: `${dias}d`, cor: 'verde' };
};

export async function render(raiz, ctx, lojaId) {
  ctx.setTitulo('Produtos no controle');

  const podeEditar = ctx.pode('validade', 'editar');
  const podeExcluir = ctx.pode('validade', 'excluir');

  const [itens, lojas] = await Promise.all([
    listar('val_itens', { ordem: 'data_vencimento' }),
    listar('arm_lojas', { ordem: 'nome' }),
  ]);

  const nomeLoja = new Map(lojas.map((l) => [l.id, l.nome]));
  const filtroLoja = lojaId || '';

  raiz.innerHTML = `
    <div class="cartao">
      <div class="cartao-topo">
        <h2>${itens.length} item(ns) no controle</h2>
        <a class="botao botao-pequeno botao-primario"
           href="#/lancar/${encodeURIComponent(filtroLoja)}">Lançar produto</a>
      </div>

      <div class="grade grade-2" style="max-width:720px">
        <label class="campo"><span>Estabelecimento</span>
          <select id="filtro-loja">
            <option value="">Todos</option>
            ${lojas.map((l) => `<option value="${ui.esc(l.id)}" ${
              l.id === filtroLoja ? 'selected' : ''}>${ui.esc(l.nome)}</option>`).join('')}
          </select></label>
        <label class="campo"><span>Pesquisar</span>
          <input type="search" id="busca" placeholder="EAN, SKU ou descrição"></label>
      </div>

      <div id="tabela" style="margin-top:12px"></div>
    </div>`;

  const selLoja = raiz.querySelector('#filtro-loja');
  const busca = raiz.querySelector('#busca');
  const tabela = raiz.querySelector('#tabela');

  function desenhar() {
    const termo = busca.value.trim().toLowerCase();
    const loja = selLoja.value;

    const visiveis = itens.filter((i) => {
      if (loja && i.loja_id !== loja) return false;
      if (!termo) return true;
      return `${i.ean || ''} ${i.sku || ''} ${i.descricao || ''}`.toLowerCase().includes(termo);
    });

    tabela.innerHTML = visiveis.length ? `
      <div class="tabela-rolagem"><table>
        <thead><tr>
          <th>Vencimento</th><th>Situação</th><th>Loja</th>
          <th>Quantidade</th><th>EAN</th><th>SKU</th><th>Descrição</th>
          <th>UMB</th><th>Categoria</th><th>Retorno</th><th>Remetente</th><th></th>
        </tr></thead>
        <tbody>
          ${visiveis.map((i) => {
            const st = situacao(i);
            return `<tr>
              <td>${i.data_vencimento ? ui.dataBR(i.data_vencimento) : '—'}</td>
              <td>${ui.badge(st.texto, st.cor)}</td>
              <td>${ui.esc(nomeLoja.get(i.loja_id) || '—')}</td>
              <td class="num">${ui.num(i.quantidade, 3)}</td>
              <td class="mono">${ui.esc(i.ean || '—')}</td>
              <td class="mono">${ui.esc(i.sku || '—')}</td>
              <td>${ui.esc(i.descricao || '')}</td>
              <td>${ui.esc(i.umb || '')}</td>
              <td>${ui.esc(i.categoria || '')}</td>
              <td>${i.status === 'respondido'
                ? ui.badge('respondido', 'verde')
                : ui.badge('aguardando', 'neutro')}</td>
              <td>${ui.esc(i.remetente || '—')}</td>
              <td class="acoes">
                ${podeEditar ? `<button type="button" class="botao-pequeno"
                  data-editar="${ui.esc(i.id)}">Editar</button>` : ''}
                ${podeExcluir ? `<button type="button" class="botao-pequeno botao-perigo"
                  data-excluir="${ui.esc(i.id)}">Excluir</button>` : ''}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>` : ui.vazio('Nenhum produto no controle com esse filtro.');

    ligar();
  }

  function ligar() {
    for (const b of tabela.querySelectorAll('[data-editar]')) {
      b.addEventListener('click', () => {
        const item = itens.find((i) => i.id === b.dataset.editar);
        if (!item) return;

        const { fechar, corpo } = ui.modal({
          titulo: `Editar — ${item.descricao || item.sku}`,
          largura: '520px',
          corpo: `
            <label class="campo"><span>Quantidade</span>
              <input id="quantidade" type="number" step="0.001"
                     value="${item.quantidade ?? 0}"></label>
            <label class="campo"><span>Data de vencimento</span>
              <input id="vencimento" type="date" value="${ui.esc(item.data_vencimento || '')}"></label>
            <div class="linha-acoes" style="margin-top:12px">
              <button type="button" class="botao-primario" id="salvar">Salvar</button>
              <button type="button" id="cancelar">Cancelar</button>
            </div>`,
        });

        corpo.querySelector('#cancelar').addEventListener('click', fechar);
        corpo.querySelector('#salvar').addEventListener('click', async () => {
          const qtd = Number(corpo.querySelector('#quantidade').value) || 0;
          const venc = corpo.querySelector('#vencimento').value;
          try {
            await atualizar('val_itens', item.id, {
              quantidade: qtd, data_vencimento: venc,
            });
            ui.toast('Item atualizado.');
            fechar();
            ctx.recarregar();
          } catch (erro) { ui.toast(erro.message, 'erro'); }
        });
      });
    }

    for (const b of tabela.querySelectorAll('[data-excluir]')) {
      b.addEventListener('click', async () => {
        if (!window.confirm('Excluir este item do controle?')) return;
        try {
          await excluir('val_itens', b.dataset.excluir);
          ui.toast('Item excluído.');
          ctx.recarregar();
        } catch (erro) { ui.toast(erro.message, 'erro'); }
      });
    }
  }

  selLoja.addEventListener('change', desenhar);
  busca.addEventListener('input', desenhar);
  desenhar();
}
