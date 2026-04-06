from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from .models import Consumivel, MovimentacaoConsumivel
from .forms import ConsumivelForm, MovimentacaoForm
from rh.models import Colaborador
import openpyxl
from django.http import HttpResponse

@login_required
def lista_consumiveis(request):
    busca = request.GET.get('q')
    consumiveis = Consumivel.objects.filter(excluido=False).order_by('nome')
    
    # Buscamos todos os colaboradores ativos
    colaboradores = Colaborador.objects.filter(ativo=True).order_by('nome')
    
    if busca:
        consumiveis = consumiveis.filter(Q(nome__icontains=busca))
        
    form_movimentacao = MovimentacaoForm()
        
    return render(request, 'consumiveis/lista_consumiveis.html', {
        'consumiveis': consumiveis,
        'form_movimentacao': form_movimentacao,
        'colaboradores': colaboradores # <-- Enviamos para o HTML aqui!
    })

@login_required
def novo_consumivel(request):
    if request.method == 'POST':
        form = ConsumivelForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Item de almoxarifado cadastrado com sucesso!')
            return redirect('lista_consumiveis')
    else:
        form = ConsumivelForm()
    # Atenção: Atualizamos a pasta para 'consumiveis/'
    return render(request, 'consumiveis/form_consumivel.html', {'form': form})

@login_required
def editar_consumivel(request, id):
    consumivel = get_object_or_404(Consumivel, id=id)
    if request.method == 'POST':
        form = ConsumivelForm(request.POST, instance=consumivel)
        if form.is_valid():
            form.save()
            messages.success(request, 'Item atualizado com sucesso!')
            return redirect('lista_consumiveis')
    else:
        form = ConsumivelForm(instance=consumivel)
    return render(request, 'consumiveis/form_consumivel.html', {'form': form, 'consumivel': consumivel})

@login_required
def excluir_consumivel(request, id):
    consumivel = get_object_or_404(Consumivel, id=id)
    if request.method == 'POST':
        consumivel.excluido = True  # Em vez de deletar, marcamos como excluido
        consumivel.save()
        messages.warning(request, f'Item "{consumivel.nome}" movido para a lixeira.')
        return redirect('lista_consumiveis')
    return render(request, 'consumiveis/confirmar_exclusao.html', {'item': consumivel})

@login_required
def registrar_movimentacao(request, id):
    """
    O Coração do Almoxarifado:
    Salva o histórico de quem pegou e atualiza o saldo matematicamente.
    """
    consumivel = get_object_or_404(Consumivel, id=id)
    
    if request.method == 'POST':
        form = MovimentacaoForm(request.POST)
        
        if form.is_valid():
            # Cria a movimentação na memória, mas não salva no banco ainda
            movimentacao = form.save(commit=False)
            movimentacao.consumivel = consumivel
            
            # Lógica inteligente de saldo
            if movimentacao.tipo == 'entrada':
                consumivel.quantidade_atual += movimentacao.quantidade
                
            elif movimentacao.tipo == 'saida':
                # Trava de segurança contra estoque negativo
                if movimentacao.quantidade > consumivel.quantidade_atual:
                    messages.error(request, f'Erro: Você tentou dar saída em {movimentacao.quantidade}, mas só tem {consumivel.quantidade_atual} disponíveis.')
                    return redirect('lista_consumiveis')
                    
                consumivel.quantidade_atual -= movimentacao.quantidade
                
            # Agora sim, salva tudo no banco de dados
            consumivel.save()
            movimentacao.save()
            
            messages.success(request, f'{movimentacao.get_tipo_display()} de {movimentacao.quantidade}x {consumivel.nome} registrada!')
        else:
            messages.error(request, 'Erro ao registrar movimentação. Verifique os dados.')
            
    return redirect('lista_consumiveis')

@login_required
def historico_movimentacoes(request):
    movimentacoes = MovimentacaoConsumivel.objects.all().order_by('-data')
    
    # 1. Captura os parâmetros que vieram da URL (digitados no formulário)
    busca = request.GET.get('q')
    tipo = request.GET.get('tipo')
    data_inicio = request.GET.get('data_inicio')
    data_fim = request.GET.get('data_fim')
    
    # 2. Aplica os filtros um por um, se eles existirem
    if busca:
        movimentacoes = movimentacoes.filter(
            Q(consumivel__nome__icontains=busca) |
            Q(responsavel__nome__icontains=busca) |
            Q(destino__icontains=busca) |
            Q(observacao__icontains=busca)
        )
        
    if tipo:
        movimentacoes = movimentacoes.filter(tipo=tipo)
        
    if data_inicio:
        # data__date__gte significa "Maior ou igual à data selecionada"
        movimentacoes = movimentacoes.filter(data__date__gte=data_inicio)
        
    if data_fim:
        # data__date__lte significa "Menor ou igual à data selecionada"
        movimentacoes = movimentacoes.filter(data__date__lte=data_fim)
        
    return render(request, 'consumiveis/historico.html', {'movimentacoes': movimentacoes})

@login_required
def exportar_movimentacoes_excel(request):
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Histórico Filtrado"
    ws.append(['Data', 'Item', 'Tipo', 'Quantidade', 'Responsável', 'Destino', 'Observação'])

    for cell in ws[1]:
        cell.font = openpyxl.styles.Font(bold=True)

    # REPETIMOS A MESMA LÓGICA DE FILTRO AQUI PARA O EXCEL FICAR IGUAL À TELA
    movimentacoes = MovimentacaoConsumivel.objects.all().order_by('-data')
    busca = request.GET.get('q')
    tipo = request.GET.get('tipo')
    data_inicio = request.GET.get('data_inicio')
    data_fim = request.GET.get('data_fim')
    
    if busca:
        movimentacoes = movimentacoes.filter(Q(consumivel__nome__icontains=busca) | Q(responsavel__nome__icontains=busca) | Q(destino__icontains=busca) | Q(observacao__icontains=busca))
    if tipo:
        movimentacoes = movimentacoes.filter(tipo=tipo)
    if data_inicio:
        movimentacoes = movimentacoes.filter(data__date__gte=data_inicio)
    if data_fim:
        movimentacoes = movimentacoes.filter(data__date__lte=data_fim)

    for mov in movimentacoes:
        data_formatada = mov.data.strftime('%d/%m/%Y %H:%M')
        nome_responsavel = mov.responsavel.nome if mov.responsavel else "-"
        ws.append([data_formatada, mov.consumivel.nome, mov.get_tipo_display(), mov.quantidade, nome_responsavel, mov.destino or "-", mov.observacao or "-"])

    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename="historico_almoxarifado.xlsx"'
    wb.save(response)
    return response

@login_required
def lixeira_em_lote_consumiveis(request):
    if request.method == 'POST':
        # Pega a string de IDs ("1,2,5")
        ids_texto = request.POST.get('consumiveis_ids', '')
        
        if ids_texto:
            # Quebra a string em uma lista de números: ['1', '2', '5']
            lista_ids = ids_texto.split(',')
            
            # Move todos para a lixeira de uma vez
            Consumivel.objects.filter(id__in=lista_ids).update(excluido=True)
            
            messages.warning(request, f'{len(lista_ids)} consumível(is) movido(s) para a lixeira.')
        else:
            messages.error(request, 'Nenhum item foi selecionado.')
            
    return redirect('lista_consumiveis')