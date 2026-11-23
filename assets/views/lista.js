// Produtos no controle de validade (quem tem acesso ao módulo vê e altera).
import { listar, atualizar, excluir } from '../api.js?v=20261122c';
import * as ui from '../ui.js?v=20261122c';

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

const STATUS_RETORNO = {
  aguardando: 'SEM RETORNO',
  respondido: 'RESPONDIDO',
  cancelado: 'CANCELADO',
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
        <h2><span id="contador">${itens.length}</span> produto(s) no controle de validade</h2>
        <div class="linha-acoes">
          <button type="button" class="botao-pequeno" id="imprimir">Imprimir</button>
          <a class="botao botao-pequeno botao-primario"
             href="#/lancar/${encodeURIComponent(filtroLoja)}">Lançar produto</a>
        </div>
      </div>

      <div class="grade grade-3">
        <label class="campo"><span>Estabelecimento</span>
          <select id="filtro-loja">
            <option value="">Todos</option>
            ${lojas.map((l) => `<option value="${ui.esc(l.id)}" ${
              l.id === filtroLoja ? 'selected' : ''}>${ui.esc(l.nome)}</option>`).join('')}
          </select></label>
        <label class="campo"><span>Categoria</span>
          <select id="filtro-categoria">
            <option value="">Todas</option>
            ${[...new Set(itens.map((i) => i.categoria).filter(Boolean))]
              .sort().map((c) => `<option value="${ui.esc(c)}">${ui.esc(c)}</option>`).join('')}
          </select></label>
        <label class="campo"><span>Pesquisar</span>
          <input type="search" id="busca" placeholder="EAN, SKU ou descrição"></label>
      </div>

      <div id="tabela" style="margin-top:12px"></div>
    </div>`;

  const selLoja = raiz.querySelector('#filtro-loja');
  const selCategoria = raiz.querySelector('#filtro-categoria');
  const busca = raiz.querySelector('#busca');
  const tabela = raiz.querySelector('#tabela');
  const contador = raiz.querySelector('#contador');

  function filtrados() {
    const termo = busca.value.trim().toLowerCase();
    const loja = selLoja.value;
    const categoria = selCategoria.value;

    return itens.filter((i) => {
      if (loja && i.loja_id !== loja) return false;
      if (categoria && i.categoria !== categoria) return false;
      if (!termo) return true;
      return `${i.ean || ''} ${i.sku || ''} ${i.descricao || ''}`.toLowerCase().includes(termo);
    });
  }

  function desenhar() {
    const visiveis = filtrados();
    contador.textContent = visiveis.length;

    tabela.innerHTML = visiveis.length ? `
      <div class="tabela-rolagem"><table>
        <thead><tr>
          <th>ID</th><th>Data da sinalização</th><th>Loja</th>
          <th>Data de vencimento</th><th>Situação</th><th class="num">Quantidade</th>
          <th>EAN</th><th>SKU</th><th>Descrição do produto</th><th>UMB</th>
          <th>Categoria</th><th>Retorno do comercial</th><th>Data do retorno</th>
          <th>Nome de quem deu retorno</th><th>Remetente</th><th>Auditado por</th><th></th>
        </tr></thead>
        <tbody>
          ${visiveis.map((i) => {
            const st = situacao(i);
            return `<tr>
              <td class="mono">${ui.esc((i.id || '').slice(0, 6))}</td>
              <td>${i.data_sinalizacao ? ui.dataBR(i.data_sinalizacao) : '—'}</td>
              <td>${ui.esc(nomeLoja.get(i.loja_id) || '—')}</td>
              <td>${i.data_vencimento ? ui.dataBR(i.data_vencimento) : '—'}</td>
              <td>${ui.badge(st.texto, st.cor)}</td>
              <td class="num">${ui.num(i.quantidade, 3)}</td>
              <td class="mono">${ui.esc(i.ean || '—')}</td>
              <td class="mono">${ui.esc(i.sku || '—')}</td>
              <td>${ui.esc(i.descricao || '')}</td>
              <td>${ui.esc(i.umb || '')}</td>
              <td>${ui.esc(i.categoria || '')}</td>
              <td>${i.status === 'respondido'
                ? ui.badge(ui.esc(i.retorno || 'respondido'), 'verde')
                : `<span class="sub">${STATUS_RETORNO[i.status] || 'SEM RETORNO'}</span>`}</td>
              <td>${i.data_retorno ? ui.dataBR(i.data_retorno) : '—'}</td>
              <td>${ui.esc(i.nome_retorno || '—')}</td>
              <td>${ui.esc(i.remetente || '—')}</td>
              <td>${ui.esc(i.auditado_por || '—')}</td>
              <td class="acoes">
                ${podeEditar ? `<button type="button" class="botao-pequeno"
                  data-editar="${ui.esc(i.id)}">Alterar</button>` : ''}
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
          titulo: `Alterar — ${item.descricao || item.sku}`,
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

  // ------------------------------------------------------------- imprimir
  raiz.querySelector('#imprimir')?.addEventListener('click', () => {
    document.querySelectorAll('.area-impressao').forEach((n) => n.remove());

    const visiveis = filtrados();
    const el = document.createElement('div');
    el.className = 'area-impressao';
    el.innerHTML = `
      <div class="print-topo">
        <div>
          <h1>PRODUTOS NO CONTROLE DE VALIDADE</h1>
          <div class="print-linha">Emitido em: <strong>${ui.dataBR(new Date().toISOString())}</strong></div>
        </div>
        <div style="text-align:right">
          <div class="print-linha">Itens: <strong>${visiveis.length}</strong></div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>Loja</th><th>Vencimento</th><th class="num">Qtd</th>
          <th>EAN</th><th>Descrição</th><th>UMB</th><th>Categoria</th>
          <th>Retorno</th><th>Remetente</th>
        </tr></thead>
        <tbody>
          ${visiveis.map((i) => `<tr>
            <td>${ui.esc(nomeLoja.get(i.loja_id) || '')}</td>
            <td>${i.data_vencimento ? ui.dataBR(i.data_vencimento) : ''}</td>
            <td class="num">${ui.num(i.quantidade, 3)}</td>
            <td>${ui.esc(i.ean || '')}</td>
            <td>${ui.esc(i.descricao || '')}</td>
            <td>${ui.esc(i.umb || '')}</td>
            <td>${ui.esc(i.categoria || '')}</td>
            <td>${ui.esc(i.retorno || STATUS_RETORNO[i.status] || '')}</td>
            <td>${ui.esc(i.remetente || '')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="print-observacao">Documento gerado pelo Controle de Validade em ${
        ui.dataHoraBR(new Date().toISOString())}.</div>`;

    document.body.appendChild(el);

    const limpar = () => {
      el.remove();
      window.removeEventListener('afterprint', limpar);
    };
    window.addEventListener('afterprint', limpar);
    setTimeout(limpar, 30000);

    window.print();
  });

  selLoja.addEventListener('change', desenhar);
  selCategoria.addEventListener('change', desenhar);
  busca.addEventListener('input', desenhar);
  desenhar();
}
