from django.contrib import messages
from django.http import HttpResponse
from django.template.loader import get_template
from xhtml2pdf import pisa
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from .forms import ColaboradorForm
from .models import Colaborador
from estoque.models import Equipamento
import os
from django.conf import settings

@login_required
def lista_colaboradores(request):
    busca = request.GET.get('q')
    colaboradores = Colaborador.objects.filter(excluido=False)
    
    if busca:
        # Busca por nome, email, departamento ou cargo
        colaboradores = colaboradores.filter(
            Q(nome__icontains=busca) |
            Q(email__icontains=busca) |
            Q(departamento__icontains=busca) |
            Q(cargo__icontains=busca)
        )
        
    context = {'colaboradores': colaboradores}
    return render(request, 'rh/lista_colaboradores.html', context)

@login_required
def novo_colaborador(request):
    if request.method == 'POST':
        form = ColaboradorForm(request.POST)
        if form.is_valid():
            colaborador = form.save()
            
            # Se veio do Modal, avisa para fechar
            if request.GET.get('popup'):
                campo_destino = request.GET.get('campo')
                return render(request, 'estoque/fechar_popup.html', {
                    'obj_id': colaborador.id,
                    'obj_nome': colaborador.nome,
                    'campo_id': campo_destino
                })
            
            # Se não for popup, volta pra lista
            return redirect('lista_colaboradores')
    else:
        form = ColaboradorForm()

    # === A MÁGICA DO FUNDO LIMPO AQUI ===
    template_escolhido = 'base_popup.html' if request.GET.get('popup') else 'base.html'
    
    return render(request, 'rh/form_colaborador.html', {
        'form': form, 
        'base_template': template_escolhido # Enviando para o HTML!
    })

@login_required
def editar_colaborador(request, id):
    colaborador = get_object_or_404(Colaborador, id=id)
    
    ativos = Equipamento.objects.filter(responsavel=colaborador)
    
    if request.method == 'POST':
        form = ColaboradorForm(request.POST, instance=colaborador)
        if form.is_valid():
            form.save()
            return redirect('lista_colaboradores')
    else:
        form = ColaboradorForm(instance=colaborador)
    
    context = {
        'form': form,
        'colaborador': colaborador,
        'ativos': ativos # Mandamos a lista de ativos para o HTML
    }
    return render(request, 'rh/form_colaborador.html', context)

@login_required
def excluir_colaborador(request, id):
    colaborador = get_object_or_404(Colaborador, id=id)
    
    if request.method == 'POST':
        colaborador.excluido = True # Move para a lixeira!
        colaborador.save()
        messages.warning(request, f'Colaborador "{colaborador.nome}" movido para a lixeira.')
        return redirect('lista_colaboradores') # Ajuste para o nome da sua url de lista
        
    # Podemos reaproveitar aquela tela amarela bonita que fizemos!
    return render(request, 'consumiveis/confirmar_exclusao.html', {'item': colaborador})

@login_required
def gerar_termo_pdf(request, id):
    colaborador = get_object_or_404(Colaborador, id=id)
    equipamentos = colaborador.equipamentos_responsavel.all()
    
    caminho_logo = os.path.join(settings.BASE_DIR, 'static', 'img', 'C:\\Users\\gh101\\Downloads\\ICTQ-04.png')

    context = {
        'colaborador': colaborador,
        'equipamentos': equipamentos,
        'caminho_logo': caminho_logo
    }

    template_path = 'rh/termo_pdf.html'
    template = get_template(template_path)
    html = template.render(context)

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="Termo_Responsabilidade_{colaborador.nome}.pdf"'

    pisa_status = pisa.CreatePDF(html, dest=response)
    
    if pisa_status.err:
        return HttpResponse('Tivemos um erro ao gerar o PDF: <pre>' + html + '</pre>')
    
    return response

@login_required
def lixeira_em_lote_colaboradores(request):
    if request.method == 'POST':
        # Pega a string de IDs ("1,2,5")
        ids_texto = request.POST.get('colaboradores_ids', '')
        
        if ids_texto:
            # Quebra a string em uma lista de números: ['1', '2', '5']
            lista_ids = ids_texto.split(',')
            
            # Move todos para a lixeira de uma vez
            Colaborador.objects.filter(id__in=lista_ids).update(excluido=True)
            
            messages.warning(request, f'{len(lista_ids)} colaborador(es) movido(s) para a lixeira.')
        else:
            messages.error(request, 'Nenhum colaborador foi selecionado.')
            
    # Certifique-se de que o nome da URL de redirecionamento está correto
    return redirect('lista_colaboradores')