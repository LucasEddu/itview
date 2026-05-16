import pandas as pd
import os

path = r'C:\Users\Lucas.moura\Downloads\Dados\dadosBI\Relatório Detalhado.xlsx'
df = pd.read_excel(path)

# Try to find 'Satisfeito' anywhere in the dataframe
mask = df.apply(lambda row: row.astype(str).str.contains('Satisfeito', case=False).any(), axis=1)
found_rows = df[mask]

print(f"Total rows: {len(df)}")
print(f"Rows with 'Satisfeito': {len(found_rows)}")

# If found, show where
if len(found_rows) > 0:
    for idx, row in found_rows.head(1).iterrows():
        print(f"Found in row {idx}:")
        print(row.to_dict())

# List all columns and their types again just to be sure
print("\n--- Detailed Column Info ---")
for col in df.columns:
    non_null = df[col].dropna()
    print(f"Column: {col} | Type: {df[col].dtype} | Non-null count: {len(non_null)}")
    if len(non_null) > 0:
        print(f"  Example: {non_null.iloc[0]}")
