import csv
from datetime import datetime

from django.db import IntegrityError
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from api.serializers import serialize_equipment
from api.utils import api_login_required, form_errors, int_list, json_error, post_or_json, request_data
from estoque.forms import EquipamentoForm
from estoque.models import Categoria, Equipamento
from estoque.views import baixar_modelo_csv, exportar_inventario
from rh.models import Colaborador


def _filtered_equipments(params):
    search = params.get('q') or params.get('search')
    ordering = params.get('ordenar') or params.get('ordering')
    category_id = params.get('categoria') or params.get('category')
    start_date = params.get('data_inicio') or params.get('start_date')
    end_date = params.get('data_fim') or params.get('end_date')

    equipments = Equipamento.objects.filter(excluido=False).select_related('categoria', 'responsavel', 'validador')

    if search:
        equipments = equipments.filter(
            Q(nome__icontains=search)
            | Q(num_patrimonio__icontains=search)
            | Q(local__icontains=search)
            | Q(categoria__nome__icontains=search)
            | Q(responsavel__nome__icontains=search)
        )

    if category_id:
        equipments = equipments.filter(categoria_id=category_id)

    if start_date:
        equipments = equipments.filter(data__gte=start_date)

    if end_date:
        equipments = equipments.filter(data__lte=end_date)

    if ordering in {'data', '-data', 'nome', '-nome', 'status', '-status'}:
        equipments = equipments.order_by(ordering)
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
    return JsonResponse({'detail': 'Equipamento criado com sucesso.', 'item': serialize_equipment(equipment)}, status=201)


@require_http_methods(['GET', 'POST'])
@api_login_required
def equipment_detail(request, equipment_id):
    equipment = get_object_or_404(Equipamento.objects.select_related('categoria', 'responsavel', 'validador'), id=equipment_id)

    if request.method == 'GET':
        return JsonResponse({'item': serialize_equipment(equipment)})

    form = EquipamentoForm(request.POST, request.FILES, instance=equipment)
    if not form.is_valid():
        return json_error('Nao foi possivel atualizar o equipamento.', errors=form_errors(form))

    equipment = form.save()
    return JsonResponse({'detail': 'Equipamento atualizado com sucesso.', 'item': serialize_equipment(equipment)})


@require_POST
@api_login_required
def transfer_equipment(request, equipment_id):
    equipment = get_object_or_404(Equipamento, id=equipment_id, excluido=False)
    data = request_data(request)
    collaborator_id = data.get('novo_responsavel') or data.get('responsavel_id')

    if collaborator_id:
        collaborator = get_object_or_404(Colaborador, id=collaborator_id, excluido=False)
        equipment.responsavel = collaborator
        equipment.status = 'em_uso'
        detail = f'{equipment.nome} transferido para {collaborator.nome}.'
    else:
        equipment.responsavel = None
        equipment.status = 'disponivel'
        detail = f'{equipment.nome} devolvido ao estoque.'

    equipment.save()
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
        equipments.update(responsavel=collaborator, status='em_uso')
        detail = f'{equipments.count()} equipamento(s) transferido(s) para {collaborator.nome}.'
    else:
        equipments.update(responsavel=None, status='disponivel')
        detail = f'{equipments.count()} equipamento(s) devolvido(s) ao estoque.'

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
    if not uploaded or not uploaded.name.endswith('.csv'):
        return json_error('Envie um arquivo CSV valido.')

    try:
        binary_content = uploaded.read()
        try:
            decoded_lines = binary_content.decode('utf-8-sig').splitlines()
        except UnicodeDecodeError:
            decoded_lines = binary_content.decode('iso-8859-1').splitlines()

        reader = csv.DictReader(decoded_lines, delimiter=';')
        status_map = {
            'em uso': 'em_uso',
            'em_uso': 'em_uso',
            'uso': 'em_uso',
            'estoque': 'disponivel',
            'em estoque': 'disponivel',
            'disponivel': 'disponivel',
            'disponível': 'disponivel',
            'descartado': 'descarte',
            'manutenção': 'manutencao',
            'manutencao': 'manutencao',
        }

        successes = 0
        errors = []

        for index, row in enumerate(reader, start=1):
            name = (row.get('Nome') or '').strip()
            patrimony = (row.get('Patrimonio') or row.get('Patrimônio') or '').strip()
            category_name = (row.get('Categoria') or '').strip()
            status_input = (row.get('Status') or '').strip().lower()

            if not name or not patrimony or not category_name:
                errors.append(f'Linha {index}: faltam dados obrigatorios.')
                continue

            category, _ = Categoria.objects.get_or_create(nome=category_name)

            try:
                Equipamento.objects.create(
                    nome=name,
                    num_patrimonio=patrimony,
                    categoria=category,
                    status=status_map.get(status_input, 'disponivel'),
                    data=datetime.now().date(),
                )
                successes += 1
            except IntegrityError:
                errors.append(f'Linha {index}: patrimonio "{patrimony}" ja cadastrado.')
            except Exception:
                errors.append(f'Linha {index}: erro ao salvar o equipamento.')

        return JsonResponse(
            {
                'detail': 'Importacao concluida.',
                'successes': successes,
                'errors': errors,
            }
        )
    except Exception:
        return json_error('Erro critico ao ler o arquivo CSV.', status=500)


@require_GET
@api_login_required
def export_inventory(request):
    return exportar_inventario(request)


@require_GET
@api_login_required
def download_template(request):
    return baixar_modelo_csv(request)
