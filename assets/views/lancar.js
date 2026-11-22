// Lançar produto no controle de validade (por EAN/SKU).
import { listar, criar } from '../api.js?v=20261122b';
import * as ui from '../ui.js?v=20261122b';

export async function render(raiz, ctx, lojaId) {
  ctx.setTitulo('Lançar produto');

  const podeCriar = ctx.pode('validade', 'cadastrar');
  const lojas = await listar('arm_lojas', { ordem: 'nome' });

  if (!lojas.length) {
    raiz.innerHTML = `<div class="cartao">${ui.vazio('Nenhum estabelecimento cadastrado.')}</div>`;
    return;
  }

  const lojaAtual = lojaId || localStorage.getItem('validade.loja') || lojas[0].id;

  raiz.innerHTML = `
    <div class="cartao">
      <div class="cartao-topo">
        <h2>Digite o EAN</h2>
        <a class="botao botao-pequeno" href="#/lista/${encodeURIComponent(lojaAtual)}">Ver controle</a>
      </div>

      <label class="campo" style="max-width:420px"><span>Estabelecimento</span>
        <select id="loja">
          ${lojas.map((l) => `<option value="${ui.esc(l.id)}" ${
            l.id === lojaAtual ? 'selected' : ''}>${ui.esc(l.nome)}</option>`).join('')}
        </select></label>

      <div class="grade grade-2" style="margin-top:12px">
        <label class="campo"><span>EAN ou SKU</span>
          <input id="codigo" autofocus placeholder="digite ou bipe o código"></label>
        <label class="campo"><span>Quantidade</span>
          <input id="quantidade" type="number" step="0.001" min="0" placeholder="ex.: 5"></label>
        <label class="campo"><span>Data de vencimento</span>
          <input id="vencimento" type="date"></label>
        <div class="campo" style="align-self:end">
          <button type="button" class="botao-primario" id="buscar">Buscar produto</button>
        </div>
      </div>

      <div id="resultado" style="margin-top:14px"></div>
    </div>`;

  const selLoja = raiz.querySelector('#loja');
  const campoCodigo = raiz.querySelector('#codigo');
  const campoQtd = raiz.querySelector('#quantidade');
  const campoVenc = raiz.querySelector('#vencimento');
  const resultado = raiz.querySelector('#resultado');

  selLoja.addEventListener('change', () => {
    localStorage.setItem('validade.loja', selLoja.value);
    ctx.irPara(`#/lancar/${encodeURIComponent(selLoja.value)}`);
    ctx.recarregar();
  });

  async function buscar() {
    const codigo = campoCodigo.value.trim();
    if (!codigo) { ui.toast('Informe o EAN ou SKU.', 'erro'); return; }

    resultado.innerHTML = '<div class="carregando">Consultando…</div>';

    const porEan = await listar('produtos', {
      select: 'id, sku, ean, descricao, unidade, arm_categorias(descricao)',
      eq: { ean: codigo }, limite: 1,
    });
    const achados = porEan.length ? porEan : await listar('produtos', {
      select: 'id, sku, ean, descricao, unidade, arm_categorias(descricao)',
      eq: { sku: codigo }, limite: 1,
    });

    if (!achados.length) {
      resultado.innerHTML = `<div class="erro"><strong>Produto não registrado.</strong><br>
        O código ${ui.esc(codigo)} não foi encontrado. Verifique se está correto e tente novamente.
        Cadastre em <a href="https://www.jmarysystems.com.br/Produtos-Sistema/" target="_blank">
        Produtos</a>.</div>`;
      return;
    }

    const p = achados[0];
    const categoria = p.arm_categorias?.descricao || '—';
    const qtd = Number(campoQtd.value) || 0;
    const venc = campoVenc.value;

    resultado.innerHTML = `
      <div class="cartao" style="margin:0">
        <div class="cartao-topo">
          <h3>${ui.esc(p.descricao)}</h3>
          <span class="sub">${ui.esc(p.sku)}</span>
        </div>
        <div class="grade grade-2">
          <div><span class="sub">EAN</span><div>${ui.esc(p.ean || '—')}</div></div>
          <div><span class="sub">Unidade</span><div>${ui.esc(p.unidade || '—')}</div></div>
          <div><span class="sub">Categoria</span><div>${ui.esc(categoria)}</div></div>
          <div><span class="sub">Quantidade</span><div>${ui.num(qtd, 3)}</div></div>
          <div><span class="sub">Vencimento</span><div>${venc ? ui.dataBR(venc) : '—'}</div></div>
        </div>
        <div class="linha-acoes" style="margin-top:12px">
          <button type="button" class="botao-primario" id="adicionar"
            ${podeCriar ? '' : 'disabled title="Sem permissão"'}>Adicionar</button>
        </div>
      </div>`;

    resultado.querySelector('#adicionar')?.addEventListener('click', async () => {
      if (!qtd || qtd <= 0) { ui.toast('Informe a quantidade.', 'erro'); return; }
      if (!venc) { ui.toast('Informe a data de vencimento.', 'erro'); return; }

      const botao = resultado.querySelector('#adicionar');
      botao.disabled = true;
      botao.textContent = 'Adicionando…';

      try {
        await criar('val_itens', {
          loja_id: selLoja.value,
          produto_id: p.id,
          sku: p.sku,
          ean: p.ean || null,
          descricao: p.descricao,
          categoria,
          umb: p.unidade || null,
          quantidade: qtd,
          data_vencimento: venc,
          remetente: ctx.perfil?.nome || null,
          criado_por: ctx.perfil?.id || null,
        });

        ui.toast(`${p.sku} cadastrado com sucesso!`);
        campoCodigo.value = '';
        campoQtd.value = '';
        campoVenc.value = '';
        resultado.innerHTML = `<div class="aviso"><strong>Produto: ${ui.esc(p.sku)}</strong>
          — cadastrado com sucesso!</div>`;
        campoCodigo.focus();
      } catch (erro) {
        ui.toast(erro.message, 'erro');
        botao.disabled = false;
        botao.textContent = 'Adicionar';
      }
    });
  }

  raiz.querySelector('#buscar').addEventListener('click', buscar);
  campoCodigo.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); buscar(); }
  });
}
