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
                              default='disponivel', 
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
    excluido = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.nome} - {self.get_status_display()} - {self.num_patrimonio}"






