from django.db import models

class CentroDeCusto(models.Model):
    codigo = models.CharField(max_length=20, unique=True, verbose_name="Código")
    nome = models.CharField(max_length=100, verbose_name="Nome do Setor")
    orcamento_anual = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Orçamento Anual")

    def __str__(self):
        return f"{self.codigo} - {self.nome}"