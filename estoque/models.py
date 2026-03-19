from django.db import models
from rh.models import Colaborador

# Create your models here.
class Categoria(models.Model):
    nome = models.CharField(max_length=100)

    def __str__(self):
        return self.nome
    
    
class Equipamento(models.Model):
    STATUS_CHOICES = [
        ('disponivel', 'Disponível'),
        ('em_uso', 'Em Uso'),
        ('manutencao', 'Manutenção'),
        ('descarte', 'Descartado'),
    ]
    data = models.DateField(verbose_name="Data de Registro")
    validador = models.ForeignKey('rh.Colaborador', 
                                  on_delete=models.PROTECT, 
                                  null=True, blank=True, 
                                  related_name='validador_equipamentos')
    nome = models.CharField(max_length=150, verbose_name="Item")
    num_patrimonio = models.CharField(max_length=50, 
                                      unique=True,
                                      verbose_name="Número do Patrimônio", 
                                      help_text="Número de patrimônio do equipamento"
                                      )
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT)
    local = models.CharField(max_length=100, null=True, blank=True, verbose_name="Local")
    tipo = models.CharField(max_length=100, null=True, blank=True, verbose_name="Tipo")
    departamento = models.CharField(max_length=100, null=True, blank=True, verbose_name="Departamento")
    descricao = models.TextField(null=True, blank=True, verbose_name="Descrição")
    status = models.CharField(max_length=20, 
                              choices=STATUS_CHOICES, 
                              default='estoque', 
                              verbose_name="Status do Equipamento"
                              )
    #Aqui vamos conectar o equipamento com o colaborador que está utilizando ele, caso haja um
    responsavel = models.ForeignKey('rh.Colaborador', 
                                    verbose_name="Responsável", 
                                    on_delete=models.PROTECT,
                                    null=True, blank=True, 
                                    related_name='equipamentos_responsavel' 
                                    )
    observacao = models.TextField(null=True, blank=True, verbose_name="Observações Adicionais")
    foto = models.ImageField(
        upload_to='fotos_equipamentos/', 
        null=True, 
        blank=True, 
        verbose_name="Foto do Equipamento"
    )

    def __str__(self):
        return f"{self.nome} - {self.get_status_display()} - {self.num_patrimonio}"


class Consumivel(models.Model):
    nome = models.CharField(max_length=150, verbose_name="Item")
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT)
    # Controle numérico de estoque
    quantidade = models.IntegerField(
        default=0, 
        verbose_name="Quantidade em Estoque"
    )
    unidade_medida = models.CharField(
        max_length=50, 
        verbose_name="Unidade de Medida",
        help_text="Ex: Pacote, Caixa, Unidade, Litro, Kg"
    )
    # Campo extra para alertas de compra no futuro
    estoque_minimo = models.IntegerField(
        default=1, 
        verbose_name="Estoque Mínimo", 
        help_text="Quantidade para alertar necessidade de compra"
    )

    def __str__(self):
        return f"{self.nome} - {self.quantidade} {self.unidade_medida}(s)"




