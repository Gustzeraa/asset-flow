from django.http import JsonResponse
from django.views.decorators.http import require_GET

from api.serializers import serialize_lookups_payload
from api.utils import api_login_required
from estoque.models import Categoria
from rh.models import Colaborador


@require_GET
@api_login_required
def lookups(request):
    categories = Categoria.objects.all().order_by('nome')
    collaborators = Colaborador.objects.filter(excluido=False, ativo=True).order_by('nome')
    return JsonResponse(serialize_lookups_payload(categories=categories, collaborators=collaborators))
