from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.db.models import Q
from .models import Consumivel, MovimentacaoConsumivel
from .forms import ConsumivelForm, MovimentacaoForm
from rh.models import Colaborador

@login_required
def lista_consumiveis(request):
    busca = request.GET.get('q')
    consumiveis = Consumivel.objects.all().order_by('nome')
    
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
        nome = consumivel.nome
        consumivel.delete()
        messages.success(request, f'Item "{nome}" excluído do sistema.')
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
    # Puxa tudo, ordenando pela data mais recente primeiro (o sinal de 'menos' faz isso)
    movimentacoes = MovimentacaoConsumivel.objects.all().order_by('-data')
    
    return render(request, 'consumiveis/historico.html', {'movimentacoes': movimentacoes})

