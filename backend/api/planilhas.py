"""Leitura de planilhas (.xlsx / .csv) compartilhada pelas importações."""
import csv
import io
import re
import unicodedata
from datetime import date, datetime

MAX_TAMANHO_ARQUIVO = 5 * 1024 * 1024  # 5 MB


def normalizar_cabecalho(valor):
    """'Valor de Compra (R$)' -> 'valor_de_compra'; 'Código' -> 'codigo'."""
    texto_ = str(valor or '').strip().lower()
    texto_ = re.sub(r'\(.*?\)', ' ', texto_)  # remove "(R$)", "(%)" etc.
    texto_ = unicodedata.normalize('NFKD', texto_).encode('ascii', 'ignore').decode()
    texto_ = re.sub(r'[^a-z0-9]+', ' ', texto_)
    return '_'.join(texto_.split())


def mapear_colunas(cabecalho, aliases):
    """{indice_da_coluna: campo}, usando o primeiro cabeçalho reconhecido de cada campo."""
    mapa = {}
    for indice, valor in enumerate(cabecalho):
        campo = aliases.get(normalizar_cabecalho(valor))
        if campo and campo not in mapa.values():
            mapa[indice] = campo
    return mapa


def ler_linhas(arquivo):
    """Retorna as linhas não vazias da planilha (a primeira é o cabeçalho)."""
    from openpyxl import load_workbook

    nome = arquivo.name.lower()

    if nome.endswith('.xlsx'):
        wb = load_workbook(arquivo, read_only=True, data_only=True)
        ws = wb.worksheets[0]  # sempre a primeira aba
        linhas = [list(linha) for linha in ws.iter_rows(values_only=True)]
        wb.close()
    elif nome.endswith('.csv'):
        conteudo = arquivo.read()
        try:
            texto_ = conteudo.decode('utf-8-sig')
        except UnicodeDecodeError:
            texto_ = conteudo.decode('latin-1')  # CSV salvo pelo Excel no Windows
        try:
            dialeto = csv.Sniffer().sniff(texto_[:2048], delimiters=';,')
        except csv.Error:
            class dialeto(csv.excel):  # padrão do Excel em pt-BR
                delimiter = ';'
        linhas = list(csv.reader(io.StringIO(texto_), dialeto))
    else:
        raise ValueError('Formato não suportado. Envie um arquivo .xlsx ou .csv.')

    return [l for l in linhas if any(texto(c) for c in l)]


def texto(valor):
    if valor is None:
        return ''
    if isinstance(valor, float) and valor.is_integer():
        valor = int(valor)  # Excel transforma "101" em 101.0
    return str(valor).strip()


def parse_data(valor):
    """None/'' -> None. Aceita data do Excel, dd/mm/aaaa, aaaa-mm-dd, dd-mm-aaaa."""
    if valor is None or texto(valor) == '':
        return None
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    s = texto(valor)
    for formato in ('%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%d/%m/%y', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(s, formato).date()
        except ValueError:
            continue
    raise ValueError(f'Data inválida: {s}')