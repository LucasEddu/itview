import pandas as pd
import json
import sys
import os

path = r'C:\Users\Lucas.moura\Downloads\Dados\dadosBI\Relatório Detalhado.xlsx'

if not os.path.exists(path):
    print(f"Error: {path} not found")
    sys.exit(1)

try:
    df = pd.read_excel(path)
    print("--- Columns Found ---")
    print(df.columns.tolist())
    
    print("\n--- Non-Empty Values Count ---")
    print(df.notna().sum())
    
    print("\n--- Classificação Unique Values ---")
    print(df['Classificação'].dropna().unique().tolist())
    
    # Search for potential comment columns (any column with long text or words like Comentário)
    potential_comments = []
    for col in df.columns:
        if df[col].dtype == 'object':
            avg_len = df[col].dropna().astype(str).map(len).mean()
            if avg_len > 20:
                potential_comments.append(col)
    
    print("\n--- Potential Comment Columns ---")
    print(potential_comments)
    
    # Sample of potential comments
    for col in potential_comments:
        print(f"\nSample from {col}:")
        print(df[col].dropna().head(5).tolist())

except Exception as e:
    print(f"Error: {e}")
