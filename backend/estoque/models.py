from django.db import models
from datetime import date
from patrimonio.models import CentroDeCusto
from decimal import Decimal

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
    
    centro_de_custo = models.ForeignKey(
        CentroDeCusto, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='equipamentos',
        verbose_name="Centro de Custo"
    )
    valor_compra = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, verbose_name="Valor de Compra (R$)")
    data_compra = models.DateField(null=True, blank=True, verbose_name="Data da Compra")
    
    # A Receita Federal define vida útil de 5 anos para TI (20% ao ano)
    taxa_depreciacao_anual = models.DecimalField(max_digits=5, decimal_places=2, default=20.00, verbose_name="Taxa de Depreciação Anual (%)")

    @property
    def valor_atual_contabil(self):
        try:
            # 1. Se não tem valor ou data, não tem conta.
            if not getattr(self, 'valor_compra', None) or not getattr(self, 'data_compra', None):
                return getattr(self, 'valor_compra', '0.00')

            # 2. Proteção de Data (garante que é 'date' puro e não 'datetime' com fuso horário)
            data_c = self.data_compra.date() if hasattr(self.data_compra, 'date') else self.data_compra
            hoje = date.today()
            dias_de_uso = (hoje - data_c).days

            if dias_de_uso <= 0:
                return self.valor_compra

            # 3. Proteção de Tipo (Converte qualquer coisa - string, float - para Decimal puro)
            v_compra = Decimal(str(self.valor_compra).replace(',', '.'))
            
            # Pega a taxa e converte (Se vier vazio, usa 10%)
            taxa_banco = getattr(self, 'taxa_depreciacao_anual', '10.0')
            if not taxa_banco: taxa_banco = '10.0'
            v_taxa = Decimal(str(taxa_banco).replace(',', '.'))

            # 4. Cálculo Linear
            valor_depreciado = v_compra * (v_taxa / Decimal('100.0')) * (Decimal(dias_de_uso) / Decimal('365.25'))
            valor_atual = v_compra - valor_depreciado

            return round(valor_atual, 2) if valor_atual > 0 else 0.00

        except Exception as e:
            # Se a matemática explodir, ele não derruba a API, apenas devolve o valor original!
            print(f"⚠️ Erro ao calcular depreciação do equipamento {self.id}: {e}")
            return getattr(self, 'valor_compra', '0.00')
    # ==========================================
    
    data = models.DateField(verbose_name="Data de Registro")
    nome = models.CharField(max_length=150, verbose_name="Item")
    num_patrimonio = models.CharField(max_length=50, 
                                      unique=True,
                                      verbose_name="Número do Patrimônio", 
                                      help_text="Número de patrimônio do equipamento"
                                      )
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT)
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