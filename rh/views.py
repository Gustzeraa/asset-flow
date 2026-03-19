from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from .forms import ColaboradorForm
from .models import Colaborador
from estoque.models import Equipamento

@login_required
def lista_colaboradores(request):
    busca = request.GET.get('q')
    colaboradores = Colaborador.objects.all()
    
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
    # Importação segura para garantir que as mensagens funcionem
    from django.contrib import messages
    from django.db.models import ProtectedError

    colaborador = get_object_or_404(Colaborador, id=id)
    
    # Se o usuário confirmou na tela de exclusão (POST)
    if request.method == 'POST':
        try:
            colaborador.delete()
            messages.success(request, f'Colaborador "{colaborador.nome}" excluído com sucesso!')
        except ProtectedError:
            messages.error(request, f'Ação bloqueada: O colaborador "{colaborador.nome}" não pode ser excluído pois possui equipamentos vinculados a ele.')
            
        return redirect('lista_colaboradores')
        
    return render(request, 'estoque/confirmar_exclusao.html', {'item': colaborador, 'tipo': 'Colaborador'})