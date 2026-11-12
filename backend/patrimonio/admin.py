from django.contrib import admin

from .models import CentroDeCusto, ExercicioFiscal, OrcamentoCentroCusto


@admin.register(CentroDeCusto)
class CentroDeCustoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nome', 'ativo')
    list_filter = ('ativo',)
    search_fields = ('codigo', 'nome')


@admin.register(ExercicioFiscal)
class ExercicioFiscalAdmin(admin.ModelAdmin):
    list_display = ('ano', 'fechado')
    list_editable = ('fechado',)


@admin.register(OrcamentoCentroCusto)
class OrcamentoCentroCustoAdmin(admin.ModelAdmin):
    list_display = ('centro_custo', 'exercicio', 'valor')
    list_filter = ('exercicio',)
    search_fields = ('centro_custo__codigo', 'centro_custo__nome')