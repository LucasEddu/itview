import pandas as pd
import json
import os

path = r'C:\Users\Lucas.moura\Downloads\Dados\dadosBI\Relatório Detalhado.xlsx'
df = pd.read_excel(path)

# Prepare a clean dictionary for JSON
result = {
    "columns": df.columns.tolist(),
    "sample_rows": df.head(10).to_dict(orient='records'),
    "non_null_counts": df.notna().sum().to_dict(),
    "classificacao_unique": df['Classificação'].dropna().unique().tolist() if 'Classificação' in df.columns else "COLUMN MISSING"
}

with open('excel_analysis_result.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("Analysis complete. Saved to excel_analysis_result.json")
