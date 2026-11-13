import csv
from datetime import datetime

from django.db import IntegrityError
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from api.serializers import serialize_equipment
from api.utils import api_login_required, form_errors, int_list, json_error, post_or_json, request_data
from patrimonio.forms import EquipamentoForm
from patrimonio.models import Categoria, Equipamento, EquipamentoImagem, HistoricoTransferencia
from rh.models import Colaborador
import csv
from django.http import HttpResponse
from api.planilhas import ler_linhas, mapear_colunas, texto

ALIASES_EQUIPAMENTOS = {
    'nome': 'nome', 'item': 'nome', 'equipamento': 'nome',
    'patrimonio': 'patrimonio', 'num_patrimonio': 'patrimonio', 'numero_do_patrimonio': 'patrimonio',
    'categoria': 'categoria',
    'status': 'status',
}

STATUS_MAP = {
    'em uso': 'em_uso', 'em_uso': 'em_uso', 'uso': 'em_uso',
    'estoque': 'disponivel', 'em estoque': 'disponivel',
    'disponivel': 'disponivel', 'disponível': 'disponivel',
    'descartado': 'descarte', 'descarte': 'descarte',
    'manutenção': 'manutencao', 'manutencao': 'manutencao',
}


def _filtered_equipments(params):
    search = params.get('q') or params.get('search')
    ordering = params.get('ordenar') or params.get('ordering')
    category_id = params.get('categoria') or params.get('category')
    centro_custo = params.get('centro_custo') or params.get('centro_de_custo')
    start_date = params.get('data_inicio') or params.get('start_date')
    end_date = params.get('data_fim') or params.get('end_date')
    compra_inicial = params.get('data_compra_inicial')
    compra_final = params.get('data_compra_final')

    equipments = Equipamento.objects.filter(excluido=False).select_related(
        'categoria', 'responsavel', 'centro_de_custo'
    ).prefetch_related('galeria', 'historico_transferencias')

    if search:
        equipments = equipments.filter(
            Q(nome__icontains=search)
            | Q(num_patrimonio__icontains=search)
            | Q(categoria__nome__icontains=search)
            | Q(responsavel__nome__icontains=search)
        )

    if category_id:
        equipments = equipments.filter(categoria_id=category_id)

    if centro_custo == 'pendente':
        equipments = equipments.filter(centro_de_custo__isnull=True)
    elif centro_custo:
        equipments = equipments.filter(centro_de_custo_id=centro_custo)

    # Data de registro (tela de equipamentos)
    if start_date:
        equipments = equipments.filter(data__gte=start_date)
    if end_date:
        equipments = equipments.filter(data__lte=end_date)

    # Data de compra (controle contábil)
    if compra_inicial:
        equipments = equipments.filter(data_compra__gte=compra_inicial)
    if compra_final:
        equipments = equipments.filter(data_compra__lte=compra_final)

    ordenacoes = {
        'data', '-data', 'nome', '-nome', 'status', '-status',
        'valor_compra', '-valor_compra', 'data_compra', '-data_compra',
    }
    if ordering in ordenacoes:
        equipments = equipments.order_by(ordering, '-id')
    else:
        equipments = equipments.order_by('-id')

    return equipments


@require_http_methods(['GET', 'POST'])
@api_login_required
def equipments_collection(request):
    if request.method == 'GET':
        equipments = _filtered_equipments(request.GET)
        summary = {
            'total': equipments.count(),
            'disponiveis': equipments.filter(status='disponivel').count(),
            'em_uso': equipments.filter(status='em_uso').count(),
            'manutencao': equipments.filter(status='manutencao').count(),
        }
        return JsonResponse({'items': [serialize_equipment(item) for item in equipments], 'summary': summary})

    form = EquipamentoForm(request.POST, request.FILES)
    if not form.is_valid():
        return json_error('Nao foi possivel cadastrar o equipamento.', errors=form_errors(form))

    equipment = form.save()
    
    # NOVO: Salva as imagens da galeria enviadas na criação
    fotos_extras = request.FILES.getlist('galeria')
    for foto in fotos_extras[:5]: # Pega no máximo 5 fotos
        EquipamentoImagem.objects.create(equipamento=equipment, imagem=foto)

    return JsonResponse({'detail': 'Equipamento criado com sucesso.', 'item': serialize_equipment(equipment)}, status=201)


@require_http_methods(['GET', 'POST'])
@api_login_required
def equipment_detail(request, equipment_id):
    # O prefetch_related garante que o histórico venha rápido
    equipment = get_object_or_404(
        Equipamento.objects.select_related('categoria', 'responsavel').prefetch_related('galeria', 'historico_transferencias'), 
        id=equipment_id
    )

    if request.method == 'GET':
        return JsonResponse({'item': serialize_equipment(equipment)})

    # 1. O DETETIVE: Guarda quem era o responsável ANTES de salvar a edição
    responsavel_antigo = equipment.responsavel

    form = EquipamentoForm(request.POST, request.FILES, instance=equipment)
    if not form.is_valid():
        return json_error('Nao foi possivel atualizar o equipamento.', errors=form_errors(form))

    equipment = form.save()
    
    # 2. O GATILHO: Se o responsável mudou durante a edição, cria o histórico na mesma hora!
    if responsavel_antigo != equipment.responsavel:
        from patrimonio.models import HistoricoTransferencia # Import local para garantir que funciona
        HistoricoTransferencia.objects.create(
            equipamento=equipment,
            responsavel_anterior=responsavel_antigo,
            responsavel_novo=equipment.responsavel
        )

    # Salva as imagens da galeria
    fotos_extras = request.FILES.getlist('galeria')
    for foto in fotos_extras[:5]:
        EquipamentoImagem.objects.create(equipamento=equipment, imagem=foto)

    return JsonResponse({'detail': 'Equipamento atualizado com sucesso.', 'item': serialize_equipment(equipment)})


@require_POST
@api_login_required
def transfer_equipment(request, equipment_id):
    equipment = get_object_or_404(Equipamento, id=equipment_id, excluido=False)
    data = request_data(request)
    collaborator_id = data.get('novo_responsavel') or data.get('responsavel_id')

    # 1. Guarda o responsável antigo antes de sobrescrever
    responsavel_anterior = equipment.responsavel 

    if collaborator_id:
        collaborator = get_object_or_404(Colaborador, id=collaborator_id, excluido=False)
        equipment.responsavel = collaborator
        equipment.status = 'em_uso'
        detail = f'{equipment.nome} transferido para {collaborator.nome}.'
    else:
        collaborator = None
        equipment.responsavel = None
        equipment.status = 'disponivel'
        detail = f'{equipment.nome} devolvido ao estoque.'

    equipment.save()

    # 2. Salva o registro no histórico
    HistoricoTransferencia.objects.create(
        equipamento=equipment,
        responsavel_anterior=responsavel_anterior,
        responsavel_novo=collaborator
    )

    return JsonResponse({'detail': detail, 'item': serialize_equipment(equipment)})


@require_POST
@api_login_required
def trash_equipment(request, equipment_id):
    equipment = get_object_or_404(Equipamento, id=equipment_id, excluido=False)
    equipment.excluido = True
    equipment.save(update_fields=['excluido'])
    return JsonResponse({'detail': f'Equipamento "{equipment.nome}" movido para a lixeira.'})


@require_POST
@api_login_required
def bulk_transfer(request):
    data = request_data(request)
    ids = int_list(data, 'ids', 'equipamentos_ids', 'equipment_ids')
    if not ids:
        return json_error('Nenhum equipamento foi selecionado.')

    equipments = Equipamento.objects.filter(id__in=ids, excluido=False)
    collaborator_id = data.get('novo_responsavel') or data.get('responsavel_id')

    if collaborator_id:
        collaborator = get_object_or_404(Colaborador, id=collaborator_id, excluido=False)
        status_novo = 'em_uso'
        detail = f'{equipments.count()} equipamento(s) transferido(s) para {collaborator.nome}.'
    else:
        collaborator = None
        status_novo = 'disponivel'
        detail = f'{equipments.count()} equipamento(s) devolvido(s) ao estoque.'

    # 1. Prepara o histórico ANTES de atualizar os dados no banco
    historicos = []
    for eq in equipments:
        historicos.append(
            HistoricoTransferencia(
                equipamento=eq,
                responsavel_anterior=eq.responsavel,
                responsavel_novo=collaborator
            )
        )

    # 2. Cria todos os registros de histórico de uma vez só (alta performance)
    HistoricoTransferencia.objects.bulk_create(historicos)

    # 3. Atualiza todos os equipamentos de uma vez
    equipments.update(responsavel=collaborator, status=status_novo)

    return JsonResponse({'detail': detail})


@require_POST
@api_login_required
def bulk_change_category(request):
    data = request_data(request)
    ids = int_list(data, 'ids', 'equipamentos_ids', 'equipment_ids')
    category_id = data.get('nova_categoria') or data.get('categoria_id') or data.get('category_id')
    if not ids or not category_id:
        return json_error('Selecione equipamentos e categoria.')

    category = get_object_or_404(Categoria, id=category_id)
    equipments = Equipamento.objects.filter(id__in=ids, excluido=False)
    updated = equipments.count()
    equipments.update(categoria=category)
    return JsonResponse({'detail': f'Categoria alterada em {updated} equipamento(s).'})


@require_POST
@api_login_required
def bulk_trash(request):
    data = request_data(request)
    ids = int_list(data, 'ids', 'equipamentos_ids', 'equipment_ids')
    if not ids:
        return json_error('Nenhum equipamento foi selecionado.')

    updated = Equipamento.objects.filter(id__in=ids, excluido=False).update(excluido=True)
    return JsonResponse({'detail': f'{updated} equipamento(s) movido(s) para a lixeira.'})


@require_POST
@api_login_required
def import_inventory(request):
    uploaded = request.FILES.get('file') or request.FILES.get('arquivo_csv')
    if not uploaded or not uploaded.name.lower().endswith(('.csv', '.xlsx')):
        return json_error('Envie um arquivo .csv ou .xlsx.')

    try:
        linhas = ler_linhas(uploaded)  # aceita ; ou , e também .xlsx
    except Exception:
        return json_error('Não foi possível ler o arquivo.')

    if len(linhas) < 2:
        return json_error('A planilha não tem linhas para importar.')

    mapa = mapear_colunas(linhas[0], ALIASES_EQUIPAMENTOS)  # ignora maiúsculas e acentos
    faltando = {'nome', 'patrimonio', 'categoria'} - set(mapa.values())
    if faltando:
        return json_error(f'Coluna(s) não encontrada(s): {", ".join(sorted(faltando))}. Use a planilha modelo.')

    successes = 0
    errors = []

    for index, linha in enumerate(linhas[1:], start=2):  # linha 1 é o cabeçalho
        dados = {campo: (texto(linha[i]) if i < len(linha) else '') for i, campo in mapa.items()}
        name = dados.get('nome', '')
        patrimony = dados.get('patrimonio', '')
        category_name = dados.get('categoria', '')
        status_input = dados.get('status', '').lower()

        faltam = [rotulo for rotulo, valor in (('nome', name), ('patrimônio', patrimony), ('categoria', category_name)) if not valor]
        if faltam:
            errors.append(f'Linha {index}: falta {", ".join(faltam)}.')
            continue

        category, _ = Categoria.objects.get_or_create(nome=category_name)

        try:
            Equipamento.objects.create(
                nome=name,
                num_patrimonio=patrimony,
                categoria=category,
                status=STATUS_MAP.get(status_input, 'disponivel'),
                data=datetime.now().date(),
            )
            successes += 1
        except IntegrityError:
            errors.append(f'Linha {index}: patrimônio "{patrimony}" já cadastrado.')
        except Exception:
            errors.append(f'Linha {index}: erro ao salvar o equipamento.')

    return JsonResponse({'detail': 'Importação concluída.', 'successes': successes, 'errors': errors})


@require_GET
@api_login_required
def export_inventory(request):
    # 1. MUDANÇA AQUI: Removemos o import manual e o Equipamento.objects.filter(...)
    # Passamos o request.GET direto para a sua função de filtro!
    equipments = _filtered_equipments(request.GET)
    
    response = HttpResponse(content_type='text/csv')
    
    # Dica: mudei o nome do arquivo tirando o "completo" já que agora ele pode ser filtrado
    response['Content-Disposition'] = 'attachment; filename="inventario_equipamentos.csv"'
    
    # Força a codificação UTF-8 com BOM para o Excel abrir com acentos corretos
    response.write('\ufeff'.encode('utf8'))
    
    writer = csv.writer(response, delimiter=';')
    
    # Cabeçalho com todos os campos disponíveis no banco de dados
    writer.writerow([
        'Patrimônio', 
        'Nome', 
        'Categoria', 
        'Status', 
        'Centro de Custo',
        'Valor de Compra',
        'Valor Atual Contábil',
        'Departamento',
        'Responsável', 
        'Data de Aquisição',
        'Descrição',
        'Observações'
    ])
    
    for eq in equipments:
        # Tratamento para não quebrar caso algum campo de relacionamento esteja vazio
        categoria = eq.categoria.nome if eq.categoria else ''
        responsavel = eq.responsavel.nome if eq.responsavel else 'Sem responsável'
        data_formatada = eq.data.strftime('%d/%m/%Y') if eq.data else ''
        centro = eq.centro_de_custo.nome if eq.centro_de_custo else 'Não Atribuído'
        
        # Preenchendo as colunas na mesma ordem do cabeçalho
        writer.writerow([
            eq.num_patrimonio or '',
            eq.nome or '',
            categoria,
            eq.get_status_display() or '',
            centro,
            str(eq.valor_compra) if eq.valor_compra else "0.00",
            str(eq.valor_atual_contabil) if getattr(eq, 'valor_atual_contabil', None) else "0.00",
            eq.departamento or '',
            responsavel,
            data_formatada,
            eq.descricao or '',
            eq.observacao or ''
        ])
        
    return response


@require_GET
@api_login_required
def download_template(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="modelo_importacao_equipamentos.csv"'
    response.write('\ufeff'.encode('utf8'))
    writer = csv.writer(response, delimiter=';')
    writer.writerow(['Nome', 'Patrimonio', 'Categoria', 'Status'])
    writer.writerow(['Notebook Dell Latitude', '001', 'Notebooks', 'Em estoque'])
    return response

