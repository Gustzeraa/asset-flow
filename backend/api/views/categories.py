from django.db.models import Count
from django.db.models.deletion import ProtectedError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods

from api.serializers import serialize_category
from api.utils import api_login_required, form_errors, json_error, post_or_json
from estoque.forms import CategoriaForm
from estoque.models import Categoria


@require_http_methods(['GET', 'POST'])
@api_login_required
def categories_collection(request):
    if request.method == 'GET':
        categories = Categoria.objects.annotate(equipamentos_count=Count('equipamento')).order_by('nome')
        items = [serialize_category(item, equipment_count=item.equipamentos_count) for item in categories]
        return JsonResponse({'items': items})

    form = CategoriaForm(post_or_json(request))
    if not form.is_valid():
        return json_error('Nao foi possivel criar a categoria.', errors=form_errors(form))

    category = form.save()
    return JsonResponse({'detail': 'Categoria criada com sucesso.', 'item': serialize_category(category)}, status=201)


@require_http_methods(['GET', 'POST', 'DELETE'])
@api_login_required
def category_detail(request, category_id):
    category = get_object_or_404(Categoria, id=category_id)

    if request.method == 'GET':
        return JsonResponse({'item': serialize_category(category)})

    if request.method == 'DELETE':
        try:
            category.delete()
        except ProtectedError:
            return json_error('A categoria possui itens vinculados e nao pode ser excluida.', status=409)
        return JsonResponse({'detail': 'Categoria excluida com sucesso.'})

    form = CategoriaForm(post_or_json(request), instance=category)
    if not form.is_valid():
        return json_error('Nao foi possivel atualizar a categoria.', errors=form_errors(form))

    category = form.save()
    return JsonResponse({'detail': 'Categoria atualizada com sucesso.', 'item': serialize_category(category)})
