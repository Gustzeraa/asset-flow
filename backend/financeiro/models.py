# financeiro/models.py
from django.db import models


class CentroDeCusto(models.Model):
    codigo = models.CharField(max_length=20, unique=True, verbose_name="Código")
    nome = models.CharField(max_length=100, verbose_name="Nome do Setor")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")

    def __str__(self):
        return f"{self.codigo} - {self.nome}"


class ExercicioFiscal(models.Model):
    ano = models.PositiveIntegerField(unique=True, verbose_name="Ano")
    fechado = models.BooleanField(default=False, verbose_name="Fechado")

    class Meta:
        ordering = ['-ano']
        verbose_name = 'Exercício fiscal'
        verbose_name_plural = 'Exercícios fiscais'

    def __str__(self):
        return str(self.ano)


class OrcamentoCentroCusto(models.Model):
    centro_custo = models.ForeignKey(CentroDeCusto, on_delete=models.PROTECT, related_name='orcamentos')
    exercicio = models.ForeignKey(ExercicioFiscal, on_delete=models.PROTECT, related_name='orcamentos')
    valor = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Valor")

    class Meta:
        verbose_name = 'Orçamento do centro de custo'
        verbose_name_plural = 'Orçamentos dos centros de custo'
        constraints = [
            models.UniqueConstraint(fields=['centro_custo', 'exercicio'], name='orcamento_unico_por_exercicio'),
        ]

    def __str__(self):
        return f"{self.centro_custo.codigo} / {self.exercicio.ano}: {self.valor}"