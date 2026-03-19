from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Q, F
from .models import Equipamento, Categoria
from .forms import EquipamentoForm, CategoriaForm
from rh.models import Colaborador
from estoque.models import Consumivel
import csv
from django.http import HttpResponse

@login_required
def lista_equipamentos(request):
    busca = request.GET.get('q')
    # Captura o parâmetro de ordenação da URL (se não tiver nada, fica vazio)
    ordenar = request.GET.get('ordenar') 
    
    equipamentos = Equipamento.objects.all()
    
    # 1. Primeiro fazemos o filtro da busca (se houver)
    if busca:
        equipamentos = equipamentos.filter(
            Q(nome__icontains=busca) | 
            Q(num_patrimonio__icontains=busca) | 
            Q(local__icontains=busca) |
            Q(tipo__icontains=busca) |
            Q(responsavel__nome__icontains=busca)
        )
        
    # 2. Depois aplicamos a ordenação
    if ordenar == 'data':
        equipamentos = equipamentos.order_by('data') # Crescente (Mais antigos primeiro)
    elif ordenar == '-data':
        equipamentos = equipamentos.order_by('-data') # Decrescente (Mais novos primeiro)
    else:
        equipamentos = equipamentos.order_by('-id') # Padrão: Últimos cadastrados primeiro
        
    # Passamos a 'ordem_atual' para o HTML saber qual setinha desenhar na tela
    context = {
        'equipamentos': equipamentos,
        'ordem_atual': ordenar 
    }
    return render(request, 'estoque/lista_equipamentos.html', context)

@login_required
def novo_equipamento(request):
    if request.method == 'POST':
        form = EquipamentoForm(request.POST, request.FILES)
        if form.is_valid():
            form.save()
            return redirect('lista_equipamentos')
    else:
        form = EquipamentoForm()
    return render(request, 'estoque/form_equipamento.html', {'form': form})

@login_required
def editar_equipamento(request, id):
    equipamento = get_object_or_404(Equipamento, id=id)
    if request.method == 'POST':
        form = EquipamentoForm(request.POST, request.FILES, instance=equipamento)
        if form.is_valid():
            form.save()
            return redirect('lista_equipamentos')
    else:
        form = EquipamentoForm(instance=equipamento)
    return render(request, 'estoque/form_equipamento.html', {'form': form, 'equipamento': equipamento})

@login_required
def excluir_equipamento(request, id):
    equipamento = get_object_or_404(Equipamento, id=id)
    if request.method == 'POST':
        equipamento.delete()
        return redirect('lista_equipamentos')
    return render(request, 'estoque/confirmar_exclusao.html', {'item': equipamento})

@login_required
def nova_categoria(request):
    # 1. O usuário clicou no botão "Salvar"?
    if request.method == 'POST':
        form = CategoriaForm(request.POST)
        if form.is_valid():
            categoria = form.save()
            
            # Se veio do Modal, avisa para fechar
            if request.GET.get('popup'):
                campo_destino = request.GET.get('campo') 
                return render(request, 'estoque/fechar_popup.html', {
                    'obj_id': categoria.id,
                    'obj_nome': categoria.nome,
                    'campo_id': campo_destino
                })
            
            # Se não for popup, faz o redirecionamento normal
            return redirect('lista_categorias')
            
    # 2. O usuário só clicou para ABRIR a tela? (Método GET)
    else:
        form = CategoriaForm()
            
    # === ESTA PARTE FICA ALINHADA LÁ NO CANTO ESQUERDO ===
    # 3. Verifica qual base usar e carrega a tela (Roda para GET e POST inválido)
    template_escolhido = 'base_popup.html' if request.GET.get('popup') else 'base.html'
    
    return render(request, 'estoque/form_categoria.html', {
        'form': form,
        'base_template': template_escolhido 
    })

@login_required
def lista_categorias(request):
    categorias = Categoria.objects.all().order_by('nome')
    return render(request, 'estoque/lista_categorias.html', {'categorias': categorias})

@login_required
def excluir_categoria(request, id):
    from django.contrib import messages
    from django.db.models import ProtectedError

    categoria = get_object_or_404(Categoria, id=id)
    
    if request.method == 'POST':
        try:
            categoria.delete()
            messages.success(request, f'Categoria "{categoria.nome}" excluída com sucesso!')
            
        except ProtectedError:
            messages.error(request, f'Ação bloqueada: A categoria "{categoria.nome}" não pode ser excluída pois existem itens vinculados a ela.')
            
        return redirect('lista_categorias')
        
    return redirect('lista_categorias')

@login_required
def dashboard(request):
    # Contadores gerais
    total_equipamentos = Equipamento.objects.count()
    equipamentos_uso = Equipamento.objects.filter(status='uso').count()
    equipamentos_manutencao = Equipamento.objects.filter(status='manutencao').count()
    
    total_colaboradores = Colaborador.objects.count()
    total_consumiveis = Consumivel.objects.count()
    
    # Mágica do Django: Traz apenas os consumíveis onde a quantidade é menor ou igual ao estoque_minimo
    alertas_estoque = Consumivel.objects.filter(quantidade__lte=F('estoque_minimo'))
    
    context = {
        'total_equipamentos': total_equipamentos,
        'equipamentos_uso': equipamentos_uso,
        'equipamentos_manutencao': equipamentos_manutencao,
        'total_colaboradores': total_colaboradores,
        'total_consumiveis': total_consumiveis,
        'alertas_estoque': alertas_estoque,
    }
    return render(request, 'estoque/dashboard.html', context)

@login_required
def exportar_inventario(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="inventario_completo_ictq.csv"'
    response.write('\ufeff'.encode('utf8'))

    writer = csv.writer(response, delimiter=';')

    # 1. Cabeçalho Completo (Adicionamos todas as colunas)
    writer.writerow([
        'Nome', 'Patrimônio', 'Categoria', 'Tipo', 'Local', 'Departamento', 
        'Status', 'Responsável', 'Validador', 'Data de Registro', 
        'Descrição', 'Observação'
    ])

    equipamentos = Equipamento.objects.all().order_by('-id')

    # 2. Loop com todos os dados
    for item in equipamentos:
        # Tratamentos de Chaves Estrangeiras (Se estiver vazio, coloca um traço)
        categoria_nome = item.categoria.nome if hasattr(item, 'categoria') and item.categoria else '-'
        responsavel_nome = item.responsavel.nome if item.responsavel else 'Não atribuído'
        validador_nome = item.validador.nome if item.validador else '-'
        
        # Tratamento da Data
        data_formatada = item.data.strftime('%d/%m/%Y') if item.data else '-'
        
        # O TRUQUE DE MESTRE: Limpar as quebras de linha dos campos de texto!
        descricao_limpa = item.descricao.replace('\n', ' ').replace('\r', '') if item.descricao else '-'
        observacao_limpa = item.observacao.replace('\n', ' ').replace('\r', '') if item.observacao else '-'

        # Escreve a linha completa no Excel
        writer.writerow([
            item.nome, 
            item.num_patrimonio, 
            categoria_nome,
            item.tipo if item.tipo else '-',
            item.local if item.local else '-',
            item.departamento if item.departamento else '-',
            item.get_status_display(), 
            responsavel_nome, 
            validador_nome,
            data_formatada,
            descricao_limpa,
            observacao_limpa
        ])

    return response
