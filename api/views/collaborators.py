import os

from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.template.loader import get_template
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from xhtml2pdf import pisa

from api.serializers import serialize_collaborator
from api.utils import api_login_required, form_errors, int_list, json_error, post_or_json
from estoque.models import Equipamento
from rh.forms import ColaboradorForm
from rh.models import Colaborador


def _logo_path():
    candidate = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'static', 'img', 'logo.png')
    return candidate if os.path.exists(candidate) else ''


@require_http_methods(['GET', 'POST'])
@api_login_required
def collaborators_collection(request):
    if request.method == 'GET':
        search = request.GET.get('q') or request.GET.get('search')
        collaborators = Colaborador.objects.filter(excluido=False).order_by('nome')
        if search:
            collaborators = collaborators.filter(
                Q(nome__icontains=search)
                | Q(email__icontains=search)
                | Q(departamento__icontains=search)
                | Q(cargo__icontains=search)
            )
        return JsonResponse({'items': [serialize_collaborator(item, assets=item.equipamentos_responsavel.all()) for item in collaborators]})

    form = ColaboradorForm(post_or_json(request))
    if not form.is_valid():
        return json_error('Nao foi possivel cadastrar o colaborador.', errors=form_errors(form))

    collaborator = form.save()
    return JsonResponse({'detail': 'Colaborador criado com sucesso.', 'item': serialize_collaborator(collaborator)}, status=201)


@require_http_methods(['GET', 'POST'])
@api_login_required
def collaborator_detail(request, collaborator_id):
    collaborator = get_object_or_404(Colaborador, id=collaborator_id)
    assets = Equipamento.objects.filter(responsavel=collaborator, excluido=False).select_related('categoria').order_by('-id')

    if request.method == 'GET':
        return JsonResponse({'item': serialize_collaborator(collaborator, assets=assets)})

    form = ColaboradorForm(post_or_json(request), instance=collaborator)
    if not form.is_valid():
        return json_error('Nao foi possivel atualizar o colaborador.', errors=form_errors(form))

    collaborator = form.save()
    assets = Equipamento.objects.filter(responsavel=collaborator, excluido=False).select_related('categoria').order_by('-id')
    return JsonResponse({'detail': 'Colaborador atualizado com sucesso.', 'item': serialize_collaborator(collaborator, assets=assets)})


@require_POST
@api_login_required
def trash_collaborator(request, collaborator_id):
    collaborator = get_object_or_404(Colaborador, id=collaborator_id, excluido=False)
    collaborator.excluido = True
    collaborator.save(update_fields=['excluido'])
    return JsonResponse({'detail': f'Colaborador "{collaborator.nome}" movido para a lixeira.'})


@require_POST
@api_login_required
def bulk_trash(request):
    data = post_or_json(request)
    ids = int_list(data, 'ids', 'colaboradores_ids', 'collaborator_ids')
    if not ids:
        return json_error('Nenhum colaborador foi selecionado.')

    updated = Colaborador.objects.filter(id__in=ids, excluido=False).update(excluido=True)
    return JsonResponse({'detail': f'{updated} colaborador(es) movido(s) para a lixeira.'})


@require_GET
@api_login_required
def term_pdf(request, collaborator_id):
    collaborator = get_object_or_404(Colaborador, id=collaborator_id)
    equipments = collaborator.equipamentos_responsavel.filter(excluido=False).order_by('num_patrimonio')
    template = get_template('rh/termo_pdf.html')
    html = template.render(
        {
            'colaborador': collaborator,
            'equipamentos': equipments,
            'caminho_logo': _logo_path(),
        }
    )

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="Termo_Responsabilidade_{collaborator.nome}.pdf"'
    pdf_status = pisa.CreatePDF(html, dest=response)
    if pdf_status.err:
        return HttpResponse('Erro ao gerar PDF.', status=500)
    return response
