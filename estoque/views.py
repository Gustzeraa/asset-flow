from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Q, F
from .models import Equipamento, Categoria
from .forms import EquipamentoForm, CategoriaForm
from rh.models import Colaborador
import csv
from django.http import HttpResponse
from django.contrib import messages
from django.db import IntegrityError
from datetime import datetime
from consumiveis.models import Consumivel

@login_required
def lista_equipamentos(request):
    busca = request.GET.get('q')
    ordenar = request.GET.get('ordenar') 
    categoria_id = request.GET.get('categoria') # <-- 1. CAPTURAMOS O NOVO FILTRO
    
    equipamentos = Equipamento.objects.all()
    colaboradores = Colaborador.objects.filter(ativo=True).order_by('nome')
    categorias = Categoria.objects.all().order_by('nome')
    
    # 2. Primeiro fazemos o filtro da busca de texto (se houver)
    if busca:
        equipamentos = equipamentos.filter(
            Q(nome__icontains=busca) | 
            Q(num_patrimonio__icontains=busca) | 
            Q(local__icontains=busca) |
            Q(categoria__nome__icontains=busca) |
            Q(responsavel__nome__icontains=busca)
        )

    # 3. Depois aplicamos o filtro EXATO da Categoria (se o usuário escolheu no dropdown) <-- NOVO BLOCO
    if categoria_id:
        equipamentos = equipamentos.filter(categoria_id=categoria_id)
        
    # 4. Por fim, aplicamos a ordenação
    if ordenar == 'data':
        equipamentos = equipamentos.order_by('data') # Crescente (Mais antigos primeiro)
    elif ordenar == '-data':
        equipamentos = equipamentos.order_by('-data') # Decrescente (Mais novos primeiro)
    else:
        equipamentos = equipamentos.order_by('-id') # Padrão: Últimos cadastrados primeiro
        
    context = {
        'equipamentos': equipamentos,
        'ordem_atual': ordenar,
        'colaboradores': colaboradores,
        'categorias': categorias,
        'categoria_selecionada': categoria_id, # Enviamos para o HTML saber qual deixar 'selected'
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
def transferir_equipamento(request, id):
    equipamento = get_object_or_404(Equipamento, id=id)
    
    if request.method == 'POST':
        novo_responsavel_id = request.POST.get('novo_responsavel')
        
        if novo_responsavel_id: # Se selecionou um funcionário
            novo_responsavel = get_object_or_404(Colaborador, id=novo_responsavel_id)
            equipamento.responsavel = novo_responsavel
            equipamento.status = 'em_uso'
            messages.success(request, f'✅ {equipamento.nome} transferido para {novo_responsavel.nome} com sucesso!')
        else: # Se deixou em branco (Opção: Devolver ao Estoque)
            equipamento.responsavel = None
            equipamento.status = 'disponivel'
            messages.success(request, f'📦 {equipamento.nome} devolvido ao estoque da TI!')
            
        equipamento.save()
        
    # Após salvar, recarrega a página da tabela
    return redirect('lista_equipamentos')

@login_required
def transferir_lote(request):
    if request.method == 'POST':
        # O JavaScript vai mandar os IDs separados por vírgula (ex: "1,4,7")
        ids_string = request.POST.get('equipamentos_ids', '')
        novo_responsavel_id = request.POST.get('novo_responsavel')
        
        if ids_string:
            lista_ids = ids_string.split(',')
            
            # Buscamos todos os equipamentos selecionados de uma vez
            equipamentos = Equipamento.objects.filter(id__in=lista_ids)
            
            if novo_responsavel_id:
                novo_responsavel = get_object_or_404(Colaborador, id=novo_responsavel_id)
                equipamentos.update(responsavel=novo_responsavel, status='em_uso')
                messages.success(request, f'✅ {equipamentos.count()} equipamento(s) transferido(s) para {novo_responsavel.nome}!')
            else:
                equipamentos.update(responsavel=None, status='disponivel')
                messages.success(request, f'📦 {equipamentos.count()} equipamento(s) devolvido(s) ao estoque da TI!')
                
    return redirect('lista_equipamentos')

@login_required
def alterar_categoria_lote(request):
    if request.method == 'POST':
        ids_string = request.POST.get('equipamentos_ids', '')
        nova_categoria_id = request.POST.get('nova_categoria')
        
        if ids_string and nova_categoria_id:
            lista_ids = ids_string.split(',')
            
            # Pega a nova categoria e os equipamentos selecionados
            nova_categoria = get_object_or_404(Categoria, id=nova_categoria_id)
            equipamentos = Equipamento.objects.filter(id__in=lista_ids)
            
            # Atualiza todos de uma vez só!
            qtd = equipamentos.count()
            equipamentos.update(categoria=nova_categoria)
            
            messages.success(request, f'✅ Categoria de {qtd} equipamento(s) alterada para "{nova_categoria.nome}" com sucesso!')
        else:
            messages.error(request, 'Erro: Nenhuma categoria ou equipamento selecionado.')
            
    return redirect('lista_equipamentos')

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
    # 1. Contadores de Equipamentos
    total_equipamentos = Equipamento.objects.count()
    equipamentos_disponiveis = Equipamento.objects.filter(status='disponivel').count()
    equipamentos_uso = Equipamento.objects.filter(status='em_uso').count()
    equipamentos_manutencao = Equipamento.objects.filter(status='manutencao').count()
    
    # 2. Contadores de RH e Consumíveis (Filtrando apenas colaboradores ativos)
    total_colaboradores = Colaborador.objects.filter(ativo=True).count()
    total_consumiveis = Consumivel.objects.count()
    
    # 3. Mágica do Django: Alertas de estoque
    alertas_estoque = Consumivel.objects.filter(quantidade_atual__lte=F('estoque_minimo'))
    
    context = {
        'total_equipamentos': total_equipamentos,
        'equipamentos_disponiveis': equipamentos_disponiveis,
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

@login_required
def importar_planilha(request):
    if request.method == 'POST':
        arquivo = request.FILES.get('arquivo_csv')
        
        if not arquivo or not arquivo.name.endswith('.csv'):
            messages.error(request, 'Por favor, envie um arquivo no formato .CSV')
            return redirect('lista_equipamentos')
            
        try:
            conteudo_binario = arquivo.read()
            
            try:
                arquivo_decodificado = conteudo_binario.decode('utf-8-sig').splitlines()
            except UnicodeDecodeError:
                arquivo_decodificado = conteudo_binario.decode('iso-8859-1').splitlines()

            leitor = csv.DictReader(arquivo_decodificado, delimiter=';')
            
            # NOSSO DICIONÁRIO TRADUTOR DE STATUS
            # Mapeia o que o usuário digita na planilha para a chave exata do banco de dados
            mapa_status = {
                'em uso': 'em_uso',
                'em_uso': 'em_uso',
                'uso': 'em_uso',
                'estoque': 'disponivel',
                'em estoque': 'disponivel',
                'disponível': 'disponivel',
                'disponivel': 'disponivel',
                'descartado': 'descartado',
                'manutenção': 'manutencao',
                'manutencao': 'manutencao'
            }
            
            sucessos = 0
            erros = []
            
            for index, linha in enumerate(leitor, start=1):
                nome = linha.get('Nome', '').strip()
                patrimonio = linha.get('Patrimonio', '').strip()
                nome_categoria = linha.get('Categoria', '').strip()
                
                # Pega o status da planilha. Se a coluna nem existir, ele retorna vazio
                status_planilha = linha.get('Status', '').strip().lower()
                
                if not nome or not patrimonio or not nome_categoria:
                    erros.append(f"Linha {index}: Faltam dados obrigatórios (Nome, Patrimônio ou Categoria).")
                    continue
                
                status_banco = mapa_status.get(status_planilha, 'disponivel')
                
                categoria, _ = Categoria.objects.get_or_create(nome=nome_categoria)
                
                try:
                    Equipamento.objects.create(
                        nome=nome,
                        num_patrimonio=patrimonio,
                        categoria=categoria,
                        status=status_banco,  # Salvando a chave correta no banco!
                        data=datetime.now().date()
                    )
                    sucessos += 1
                except IntegrityError:
                    erros.append(f"Linha {index}: O Patrimônio '{patrimonio}' já existe no sistema.")
                except Exception as e:
                    erros.append(f"Linha {index}: Erro ao salvar no banco de dados.")

            if sucessos > 0:
                messages.success(request, f'✅ {sucessos} equipamentos importados para o estoque com sucesso!')
            
            if erros:
                messages.warning(request, f'⚠️ Atenção: {len(erros)} itens não foram importados.')
                for erro in erros[:5]:
                    messages.error(request, erro)
                if len(erros) > 5:
                    messages.error(request, f"... e mais {len(erros) - 5} outros erros.")

        except Exception as e:
            messages.error(request, "Erro crítico ao ler o arquivo. Salve como 'CSV (Separado por vírgulas)' no Excel.")
            
    return redirect('lista_equipamentos')

@login_required
def baixar_modelo_csv(request):
    # Avisa o navegador que a resposta é um arquivo CSV para baixar
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="modelo_importacao_equipamentos.csv"'
    
    # Cria o "escritor" do CSV usando o ponto e vírgula como separador (padrão do Excel BR)
    writer = csv.writer(response, delimiter=';')
    
    # 1. Escreve a linha de cabeçalho (Obrigatória)
    writer.writerow(['Nome', 'Patrimonio', 'Categoria', 'Status'])
    
    return response

