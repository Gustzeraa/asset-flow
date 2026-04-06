from django.db import models
from rh.models import Colaborador

# Create your models here.
class Consumivel(models.Model):
    # 'Pacote', 'Caixa', 'Unidade', 'Kg'
    UNIDADES = (
        ('un', 'Unidade'),
        ('cx', 'Caixa'),
        ('pct', 'Pacote'),
        ('kg', 'Quilo'),
    )
    
    nome = models.CharField(max_length=100, unique=True)
    unidade_medida = models.CharField(max_length=10, choices=UNIDADES, default='un')
    quantidade_atual = models.IntegerField(default=0)
    estoque_minimo = models.IntegerField(default=5)
    descricao = models.TextField(blank=True, null=True)
    excluido = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.nome} ({self.quantidade_atual} {self.unidade_medida})"

# Essa é a tabela que vai rastrear para onde foi o café e quem comprou mais copo
class MovimentacaoConsumivel(models.Model):
    TIPOS = (
        ('entrada', 'Entrada (Compra/Reposição)'),
        ('saida', 'Saída (Consumo/Uso)'),
    )
    
    consumivel = models.ForeignKey('Consumivel', on_delete=models.CASCADE, related_name='movimentacoes')
    tipo = models.CharField(max_length=10, choices=TIPOS)
    quantidade = models.IntegerField()
    data = models.DateTimeField(auto_now_add=True)
    
    # 1. Responsável agora puxa direto da tabela de colaboradores!
    responsavel = models.ForeignKey(Colaborador, on_delete=models.SET_NULL, null=True, blank=True, help_text="Quem solicitou ou retirou?")
    
    # 2. Destino fica livre para digitação
    destino = models.CharField(max_length=100, blank=True, help_text="Para onde vai? Ex: Copa, Departamento X")
    
    observacao = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.get_tipo_display()} de {self.quantidade}x {self.consumivel.nome}"