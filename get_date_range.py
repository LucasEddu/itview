import pandas as pd
import sys

path = r'C:\Users\Lucas.moura\Downloads\Dados\dadosBI\Relatório Detalhado.xlsx'
try:
    df = pd.read_excel(path)
    df['Abertura_dt'] = pd.to_datetime(df['Abertura'], format='%d/%m/%Y, %H:%M', errors='coerce')
    min_date = df['Abertura_dt'].min()
    max_date = df['Abertura_dt'].max()
    
    print(f"Data Inicial: {min_date.strftime('%d/%m/%Y')}")
    print(f"Data Final: {max_date.strftime('%d/%m/%Y')}")
except Exception as e:
    print(f"Erro: {e}")
