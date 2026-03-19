from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.db.models import Q
from .models import Consumivel
from .forms import ConsumivelForm

@login_required
def lista_consumiveis(request):
    busca = request.GET.get('q')
    consumiveis = Consumivel.objects.all()
    if busca:
        consumiveis = consumiveis.filter(
            Q(nome__icontains=busca) | Q(categoria__nome__icontains=busca)
        )
    return render(request, 'estoque/lista_consumiveis.html', {'consumiveis': consumiveis})

@login_required
def novo_consumivel(request):
    if request.method == 'POST':
        form = ConsumivelForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('lista_consumiveis')
    else:
        form = ConsumivelForm()
    return render(request, 'estoque/form_consumivel.html', {'form': form})

@login_required
def editar_consumivel(request, id):
    consumivel = get_object_or_404(Consumivel, id=id)
    if request.method == 'POST':
        form = ConsumivelForm(request.POST, instance=consumivel)
        if form.is_valid():
            form.save()
            return redirect('lista_consumiveis')
    else:
        form = ConsumivelForm(instance=consumivel)
    return render(request, 'estoque/form_consumivel.html', {'form': form, 'consumivel': consumivel})

@login_required
def excluir_consumivel(request, id):
    consumivel = get_object_or_404(Consumivel, id=id)
    if request.method == 'POST':
        consumivel.delete()
        return redirect('lista_consumiveis')
    return render(request, 'estoque/confirmar_exclusao.html', {'item': consumivel})

@login_required
def ajustar_estoque(request, id, operacao):
    consumivel = get_object_or_404(Consumivel, id=id)
    
    if operacao == 'diminuir' and consumivel.quantidade > 0:
        consumivel.quantidade -= 1
    elif operacao == 'aumentar':
        consumivel.quantidade += 1
        
    consumivel.save()
    
    # Volta para a mesma página sem o usuário nem perceber
    return redirect('lista_consumiveis')