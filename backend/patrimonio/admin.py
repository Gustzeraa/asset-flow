from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import CentroDeCusto

@admin.register(CentroDeCusto)
class CentroDeCustoAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nome', 'orcamento_anual')