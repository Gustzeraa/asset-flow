from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from api.serializers import serialize_department
from api.utils import api_login_required, json_error, post_or_json
from rh.models import Departamento

@require_http_methods(['GET', 'POST'])
@api_login_required
def departments_collection(request):
    if request.method == 'GET':
        departments = Departamento.objects.order_by('nome')
        return JsonResponse({'items': [serialize_department(item) for item in departments]})

    data = post_or_json(request)
    nome = data.get('nome', '').strip()
    
    if not nome:
        return json_error('O nome do departamento é obrigatório.')
        
    if Departamento.objects.filter(nome__iexact=nome).exists():
        return json_error('Já existe um departamento com este nome.')

    department = Departamento.objects.create(nome=nome)
    return JsonResponse({'detail': 'Departamento criado com sucesso.', 'item': serialize_department(department)}, status=201)

@require_http_methods(['GET', 'POST', 'DELETE'])
@api_login_required
def department_detail(request, department_id):
    department = get_object_or_404(Departamento, id=department_id)

    if request.method == 'GET':
        return JsonResponse({'item': serialize_department(department)})

    if request.method == 'DELETE':
        department.delete()
        return JsonResponse({'detail': 'Departamento excluído com sucesso.'})

    data = post_or_json(request)
    nome = data.get('nome', '').strip()

    if not nome:
        return json_error('O nome do departamento é obrigatório.')

    if Departamento.objects.filter(nome__iexact=nome).exclude(id=department_id).exists():
        return json_error('Já existe outro departamento com este nome.')

    department.nome = nome
    department.save()
    return JsonResponse({'detail': 'Departamento atualizado com sucesso.', 'item': serialize_department(department)})