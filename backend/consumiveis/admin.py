from django.contrib import admin
from .models import Consumivel, MovimentacaoConsumivel

@admin.register(Consumivel)
class ConsumivelAdmin(admin.ModelAdmin):
    # Usando os nomes exatos das colunas do nosso novo models.py
    list_display = ('nome', 'quantidade_atual', 'unidade_medida', 'estoque_minimo')
    search_fields = ('nome',)
    list_filter = ('unidade_medida',)
    
    # Se quiser editar direto na tela do painel Admin:
    list_editable = ('quantidade_atual', 'estoque_minimo')

@admin.register(MovimentacaoConsumivel)
class MovimentacaoConsumivelAdmin(admin.ModelAdmin):
    list_display = ('consumivel', 'tipo', 'quantidade', 'data', 'responsavel')
    list_filter = ('tipo', 'data')
    search_fields = ('consumivel__nome', 'responsavel')
    date_hierarchy = 'data'