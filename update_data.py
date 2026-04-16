import pandas as pd
import json
import random

file_path = r'C:\Users\Lucas.moura\Downloads\Dados\dadosBI\Relatório Detalhado.xlsx'

def time_to_seconds(time_str):
    if pd.isna(time_str) or not isinstance(time_str, str):
        return 0
    try:
        parts = time_str.split(':')
        if len(parts) == 3:
            h, m, s = map(int, parts)
            return h * 3600 + m * 60 + s
        elif len(parts) == 2:
            m, s = map(int, parts)
            return m * 60 + s
        return 0
    except:
        return 0

def map_csat(total_seconds):
    # Mocking CSAT based on resolution time
    if total_seconds < 1800: # 30 min
        return random.choice(['Muito Satisfeito'] * 8 + ['Satisfeito'] * 2)
    elif total_seconds < 7200: # 2 hours
        return random.choice(['Satisfeito'] * 7 + ['Muito Satisfeito'] * 2 + ['Indiferente'] * 1)
    elif total_seconds < 28800: # 8 hours
        return random.choice(['Indiferente'] * 6 + ['Satisfeito'] * 2 + ['Insatisfeito'] * 2)
    else:
        return random.choice(['Insatisfeito'] * 5 + ['Indiferente'] * 5)

try:
    df = pd.read_excel(file_path)
    
    # Convert dates
    df['Abertura_dt'] = pd.to_datetime(df['Abertura'], format='%d/%m/%Y, %H:%M', errors='coerce')
    
    # Clean strings and handle NaN
    df['Atendente'] = df['Atendente'].fillna('Não Atribuído').astype(str)
    df['Setor'] = df['Setor'].fillna('Não Informado').astype(str)
    df['Empresa'] = df['Empresa'].fillna('N/A').astype(str)
    df['Contato'] = df['Contato'].fillna('Desconhecido').astype(str)
    
    # Convert times to seconds
    df['wait'] = df['Tempo na Fila'].apply(time_to_seconds)
    df['total'] = df['Tempo'].apply(time_to_seconds)
    
    # Add CSAT Mock
    df['csat'] = df['total'].apply(map_csat)

    # Extract required fields for frontend
    records = []
    filtered_count = 0
    
    for _, row in df.iterrows():
        # FILTER: Skip records with no human agent or zero duration
        agent = str(row['Atendente']).strip()
        total_seconds = int(row['total'])
        
        # ANALYSIS: Consider 'Não Atribuído' and 'Sistema' as noise for human performance view
        if agent in ['Não Atribuído', 'Sistema', '']:
            filtered_count += 1
            continue
            
        # ANALYSIS: Tickets with 0 total time are likely abandoned or errors
        if total_seconds == 0:
            filtered_count += 1
            continue

        dt = row['Abertura_dt']
        
        date_str = ""
        hour = -1
        weekday = -1
        month_str = ""
        
        if pd.notna(dt):
            date_str = dt.strftime('%Y-%m-%d')
            month_str = dt.strftime('%Y-%m')
            hour = dt.hour
            weekday = dt.weekday()
            
        records.append({
            "id": int(row['id']) if pd.notna(row['id']) else 0,
            "agent": agent,
            "sector": row['Setor'],
            "company": row['Empresa'],
            "user": row['Contato'],
            "wait": int(row['wait']),
            "total": total_seconds,
            "date": date_str,
            "month": month_str,
            "hour": hour,
            "weekday": weekday,
            "csat": row['csat']
        })

    # Prepare final lists for frontend filters
    active_agents = sorted(list(set(r['agent'] for r in records)))
    active_sectors = sorted(list(set(r['sector'] for r in records)))

    # Prepare final output structure
    output_data = {
        "tickets": records,
        "agents": active_agents,
        "sectors": active_sectors,
        "last_updated": pd.Timestamp.now().strftime('%d/%m/%Y, %H:%M:%S')
    }
    
    with open('src/assets/data.json', 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False)
        
    print(f"Data exported successfully.")
    print(f"Total rows in spreadsheet: {len(df)}")
    print(f"Tickets filtered (Noise): {filtered_count}")
    print(f"Tickets kept (Effective): {len(records)}")

except Exception as e:
    print(f"Error: {e}")
