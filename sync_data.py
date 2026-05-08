import os
import sys
import io
import json
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Prevent encoding errors in Windows terminals
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Credentials & API endpoints
EMAIL = os.getenv("ATHENAS_EMAIL")
PASSWORD = os.getenv("ATHENAS_PASSWORD")
BASE_URL = "https://sanpaolo.api-atendimento.athenas.online"
DATA_FILE_PATH = os.path.join('src', 'assets', 'data.json')

def get_token():
    if not EMAIL or not PASSWORD:
        raise ValueError("Erro: Credenciais ATHENAS_EMAIL ou ATHENAS_PASSWORD ausentes no arquivo .env")
        
    print(f"Autenticando API para o usuário: {EMAIL}...")
    url = f"{BASE_URL}/auth"
    payload = {'email': EMAIL, 'password': PASSWORD}
    
    response = requests.post(url, json=payload, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15)
    response.raise_for_status()
    
    data = response.json()
    token = data.get('token')
    if not token:
        raise ValueError("Erro: Token não retornado no corpo da resposta da autenticação.")
    print("Autenticação realizada com sucesso!")
    return token

def get_ratings(token):
    print("Buscando avaliações de satisfação (CSAT)...")
    url = f"{BASE_URL}/SupportRatings/report"
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Authorization': f"Bearer {token}"
    }
    
    response = requests.get(url, headers=headers, timeout=20)
    response.raise_for_status()
    
    data = response.json()
    rows = data.get('rows', [])
    print(f"Total de {len(rows)} avaliações carregadas.")
    
    # Map supportId to textual CSAT
    ratings_map = {}
    csat_mapping = {
        '3': 'Muito Satisfeito',
        '2': 'Satisfeito',
        '1': 'Indiferente',
        '0': 'Insatisfeito'
    }
    
    for r in rows:
        support_id = r.get('supportId')
        rate = str(r.get('rate', '')).strip()
        if support_id and rate in csat_mapping:
            ratings_map[int(support_id)] = csat_mapping[rate]
            
    return ratings_map

def fetch_active_supports(token):
    print("Buscando chamados ativos adicionais (GET /supports)...")
    url = f"{BASE_URL}/supports"
    headers = {
        'User-Agent': 'Mozilla/5.0',
        'Authorization': f"Bearer {token}"
    }
    response = requests.get(url, headers=headers, timeout=20)
    response.raise_for_status()
    data = response.json()
    return data.get('data', [])

def fetch_tickets(token, days=30):
    start_dt = datetime.now() - timedelta(days=days)
    date_initial = start_dt.strftime("%Y-%m-%d")
    date_finish = datetime.now().strftime("%Y-%m-%d")
    
    print(f"Buscando chamados de {date_initial} até {date_finish}...")
    url = f"{BASE_URL}/report/generateFull"
    payload = {
        "sectors": [],
        "users": [],
        "dateInitial": date_initial,
        "dateFinish": date_finish
    }
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Authorization': f"Bearer {token}"
    }
    
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    
    tickets = response.json()
    print(f"{len(tickets)} chamados retornados pela API.")
    return tickets

def parse_iso_datetime(s):
    if not s:
        return None
    try:
        # Expected format: "2026-04-02T19:44:17.000Z"
        return datetime.strptime(s.split('.')[0].replace('Z', ''), '%Y-%m-%dT%H:%M:%S')
    except Exception as e:
        print(f"Erro ao converter data '{s}': {e}")
        return None

def process_sync():
    try:
        # 1. Authenticate and fetch API data
        token = get_token()
        ratings_map = get_ratings(token)
        api_tickets = fetch_tickets(token, days=30)
        
        # Fetch active live queue (unassigned / open tickets)
        try:
            active_tickets = fetch_active_supports(token)
            print(f"Sucesso: {len(active_tickets)} chamados da fila ativa recebidos.")
            api_tickets.extend(active_tickets)
        except Exception as e:
            print(f"Aviso: Falha ao buscar chamados em tempo real (/supports): {e}")
        
        # 2. Load existing data
        existing_data = {"tickets": [], "agents": [], "sectors": []}
        if os.path.exists(DATA_FILE_PATH):
            try:
                with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                print(f"Carregados {len(existing_data.get('tickets', []))} registros históricos.")
            except Exception as e:
                print(f"Aviso: Não foi possível carregar dados existentes ({e}). Iniciando do zero.")

        # Build map of existing tickets to allow in-place updates of open tickets
        tickets_map = {int(t['id']): t for t in existing_data.get('tickets', []) if 'id' in t}
        
        new_count = 0
        updated_count = 0
        
        # 3. Process tickets from API
        for t in api_tickets:
            ticket_id = int(t.get('id', 0))
            if ticket_id == 0:
                continue
                
            status_obj = t.get('Status')
            status_name = status_obj.get('name', 'Finalizado') if status_obj else 'Finalizado'
            
            # Map agent details safely
            user_obj = t.get('User')
            agent = str(user_obj.get('name', 'Não Atribuído')).strip().title() if user_obj else 'Não Atribuído'
            
            # Skip system/unassigned messages for standard KPIs (but keep them if they are open for real-time tracking)
            # Wait, the frontend App.jsx filters out 'Não Atribuído' / 'Sistema' or total=0 for standard charts.
            # So we can keep them in tickets list for our open-tickets view, but make sure we map them!
            if agent in ['', 'Nan']:
                agent = 'Não Atribuído'
                
            sector_obj = t.get('Sector')
            sector = sector_obj.get('name', 'Não Informado') if sector_obj else 'Não Informado'
            
            contact_obj = t.get('Contact')
            company = str(contact_obj.get('company', 'N/A')).strip().upper() if contact_obj else 'N/A'
            contact_name = str(contact_obj.get('name', 'Desconhecido')).strip().title() if contact_obj else 'Desconhecido'
            
            if company in ['', 'NAN']:
                company = 'N/A'
            if contact_name in ['', 'NAN']:
                contact_name = 'Desconhecido'
                
            # Process timestamps & durations
            created_at = parse_iso_datetime(t.get('createdAt'))
            start_support_at = parse_iso_datetime(t.get('startSupportAt'))
            updated_at = parse_iso_datetime(t.get('updatedAt'))
            
            # Compute Wait Time (in queue)
            wait_seconds = 0
            if start_support_at and created_at:
                wait_seconds = int((start_support_at - created_at).total_seconds())
                if wait_seconds < 0:
                    wait_seconds = 0
                    
            # Compute Total Time (resolution)
            total_seconds = 0
            if status_name == 'Finalizado' and updated_at and created_at:
                total_seconds = int((updated_at - created_at).total_seconds())
                if total_seconds < 0:
                    total_seconds = 0
                    
            # Date/time components based on creation date
            date_str = ""
            month_str = ""
            hour = -1
            weekday = -1
            
            if created_at:
                date_str = created_at.strftime('%Y-%m-%d')
                month_str = created_at.strftime('%Y-%m')
                hour = created_at.hour
                weekday = created_at.weekday()
                
            # Categorize based on Sector
            sector_upper = sector.upper()
            if "SUPORTE TECNICO -> ATHENAS" in sector_upper:
                main_category = "ATHENAS"
            elif any(x in sector_upper for x in ["DEGUST", "RESHOP"]):
                main_category = "PDV"
            elif any(x in sector_upper for x in ["TRILOGO", "EMAIL", "PCP", "TEMPER"]):
                main_category = "SISTEMAS"
            else:
                main_category = "OUTROS"
                
            # CSAT mapping
            csat_val = ratings_map.get(ticket_id, 'Sem Avaliação')
            
            ticket_obj = {
                "id": ticket_id,
                "agent": agent,
                "sector": sector,
                "main_category": main_category,
                "company": company,
                "user": contact_name,
                "wait": wait_seconds,
                "total": total_seconds,
                "date": date_str,
                "month": month_str,
                "hour": hour,
                "weekday": weekday,
                "csat": csat_val,
                "status": status_name, # Extra field for real-time tracking
                "created_at": t.get('createdAt') # ISO timestamp for frontend calculations
            }
            
            # Insert or update
            if ticket_id in tickets_map:
                # Update existing ticket (especially if it transitioned from open to closed, or changed agent)
                existing_ticket = tickets_map[ticket_id]
                # Only update if the existing ticket is not finalized, or if we want to refresh fields
                if existing_ticket.get('status') != 'Finalizado' or status_name == 'Finalizado':
                    tickets_map[ticket_id] = ticket_obj
                    updated_count += 1
            else:
                # Insert new ticket
                tickets_map[ticket_id] = ticket_obj
                new_count += 1
                
        # 4. Convert map back to list and sort by date descending
        merged_records = list(tickets_map.values())
        merged_records.sort(key=lambda x: (x['date'], x['id']), reverse=True)
        
        # 5. Load store locations if available
        stores = existing_data.get('stores', [])
        if os.path.exists('stores_locations.json'):
            try:
                with open('stores_locations.json', 'r', encoding='utf-8') as f:
                    stores = json.load(f)
            except:
                print("Aviso: Falha ao carregar stores_locations.json")
                
        # 6. Save compiled JSON
        output_data = {
            "tickets": merged_records,
            "agents": sorted(list(set(r['agent'] for r in merged_records if r['agent'] not in ['Não Atribuído', 'Sistema']))),
            "sectors": sorted(list(set(r['sector'] for r in merged_records))),
            "categories": ["ATHENAS", "PDV", "SISTEMAS", "OUTROS"],
            "stores": stores,
            "last_updated": datetime.now().strftime('%d/%m/%Y, %H:%M:%S')
        }
        
        os.makedirs(os.path.dirname(DATA_FILE_PATH), exist_ok=True)
        with open(DATA_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
            
        print(f"Dashboard sincronizado via API. Novos: {new_count} | Atualizados: {updated_count} | Total: {len(merged_records)} chamados.")
        
    except Exception as e:
        print(f"Erro no processamento da sincronização API: {e}")
        raise e

if __name__ == "__main__":
    process_sync()
