from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_http_methods, require_POST

from api.utils import api_login_required, json_error
from api.serializers import serialize_contracheque
from rh.models import Colaborador
from folha.models import Contracheque, AceiteDigital

@require_http_methods(['GET', 'POST'])
@api_login_required
def contracheques_collection(request):
    # GET: Listagem com Regra de Acesso (RBAC)
    if request.method == 'GET':
        if request.user.is_superuser:
            # RH vê tudo
            contracheques = Contracheque.objects.select_related('colaborador').all()
        else:
            # Colaborador comum vê apenas os dele. 
            # (Assumindo que o email do sistema de login é o mesmo cadastrado no Colaborador)
            contracheques = Contracheque.objects.select_related('colaborador').filter(colaborador__email=request.user.email)
            
        data = [serialize_contracheque(c) for c in contracheques]
        return JsonResponse({'items': data})

    # POST: Upload feito pelo RH
    if not request.user.is_superuser:
        return json_error('Acesso negado. Apenas o RH pode enviar contracheques.', status=403)

    colaborador_id = request.POST.get('colaborador_id')
    mes_referencia = request.POST.get('mes_referencia') # Padrão: YYYY-MM-DD
    arquivo = request.FILES.get('arquivo_pdf')

    if not all([colaborador_id, mes_referencia, arquivo]):
        return json_error('Dados incompletos. Informe o colaborador, o mês e anexe o PDF.')

    colaborador = get_object_or_404(Colaborador, id=colaborador_id, excluido=False)

    if Contracheque.objects.filter(colaborador=colaborador, mes_referencia=mes_referencia).exists():
        return json_error(f'O contracheque de {mes_referencia} já foi enviado para {colaborador.nome}.')

    contracheque = Contracheque.objects.create(
        colaborador=colaborador,
        mes_referencia=mes_referencia,
        arquivo_pdf=arquivo,
        status='pendente'
    )

    return JsonResponse({
        'detail': 'Contracheque enviado com sucesso.',
        'item': serialize_contracheque(contracheque)
    }, status=201)


@require_POST
@api_login_required
def assinar_contracheque(request, contracheque_id):
    # Garante que só o dono do email pode assinar o próprio contracheque
    contracheque = get_object_or_404(
        Contracheque, 
        id=contracheque_id, 
        colaborador__email=request.user.email
    )

    if contracheque.status == 'assinado':
        return json_error('Este contracheque já foi assinado digitalmente.')

    # Captura IP e Navegador
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    ip_origem = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', 'Desconhecido')

    # Registra o aceite e atualiza status
    AceiteDigital.objects.create(
        contracheque=contracheque,
        ip_origem=ip_origem,
        user_agent=user_agent
    )
    
    contracheque.status = 'assinado'
    contracheque.save(update_fields=['status', 'atualizado_em'])

    return JsonResponse({
        'detail': 'Contracheque assinado com sucesso. Seu recibo digital foi gerado.',
        'item': serialize_contracheque(contracheque)
    })