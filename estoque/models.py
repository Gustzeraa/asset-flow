from django.db import models

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
    

class EquipamentoImagem(models.Model):
    equipamento = models.ForeignKey(
        Equipamento, 
        on_delete=models.CASCADE, 
        related_name='galeria'
    )
    imagem = models.ImageField(upload_to='fotos_equipamentos/galeria/')
    data_upload = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Imagem de {self.equipamento.nome}"
    
    
class HistoricoTransferencia(models.Model):
    equipamento = models.ForeignKey(
        Equipamento, 
        on_delete=models.CASCADE, 
        related_name='historico_transferencias'
    )
    # Usamos SET_NULL para que, se um colaborador for excluído no futuro, o histórico da máquina não suma
    responsavel_anterior = models.ForeignKey(
        'rh.Colaborador', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='historico_anterior'
    )
    responsavel_novo = models.ForeignKey(
        'rh.Colaborador', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='historico_novo'
    )
    data_transferencia = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        ant = self.responsavel_anterior.nome if self.responsavel_anterior else "Estoque Interno"
        novo = self.responsavel_novo.nome if self.responsavel_novo else "Estoque Interno"
        return f"{self.equipamento.nome}: {ant} ➔ {novo} ({self.data_transferencia.strftime('%d/%m/%Y')})"