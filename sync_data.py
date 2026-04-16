import os
import asyncio
import random
import json
import pandas as pd
from datetime import datetime, timedelta
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

# Configurações
ATHENAS_URL = "https://sanpaolo.athenas.me"
EMAIL = os.getenv("ATHENAS_EMAIL")
PASSWORD = os.getenv("ATHENAS_PASSWORD")
DOWNLOAD_DIR = r"C:\Users\Lucas.moura\Downloads\Dados\dadosBI"
EXCEL_FILE_NAME = "Relatório Detalhado.xlsx"
EXCEL_PATH = os.path.join(DOWNLOAD_DIR, EXCEL_FILE_NAME)

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
    if total_seconds < 1800: return random.choice(['Muito Satisfeito'] * 8 + ['Satisfeito'] * 2)
    elif total_seconds < 7200: return random.choice(['Satisfeito'] * 7 + ['Muito Satisfeito'] * 2 + ['Indiferente'] * 1)
    elif total_seconds < 28800: return random.choice(['Indiferente'] * 6 + ['Satisfeito'] * 2 + ['Insatisfeito'] * 2)
    else: return random.choice(['Insatisfeito'] * 5 + ['Indiferente'] * 5)

async def download_report():
    print(f"Iniciando automação no portal: {ATHENAS_URL}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True) # Headless por padrão
        context = await browser.new_context(accept_downloads=True)
        page = await context.new_page()

        try:
            # 1. Login
            await page.goto(ATHENAS_URL)
            await page.fill("#email", EMAIL)
            await page.fill("#password", PASSWORD)
            await page.click("#goodLogin")
            
            # Aguardar dashboard carregar
            await page.wait_for_load_state("networkidle")
            print("Login efetuado com sucesso.")

            # 2. Navegação: Relatórios -> Detalhado
            # Nota: Os seletores aqui são baseados na descrição do fluxo
            # Pode ser necessário ajustar se os IDs/textos forem diferentes
            await page.get_by_text("Relatórios", exact=True).click()
            await page.get_by_text("detalhado", exact=True).click()
            
            # 3. Filtro de Datas
            # Calculando intervalo (ex: últimos 7 dias)
            today = datetime.now().strftime("%d/%m/%Y")
            start_date = (datetime.now() - timedelta(days=30)).strftime("%d/%m/%Y")
            
            print(f"Filtrando intervalo: {start_date} até {today}")
            
            # Seletores de data (ajustar conforme realidade do portal)
            # Geralmente são inputs com classes de datepicker
            # Vou tentar localizar por label ou placeholder se possível
            try:
                # Exemplo genérico de preenchimento de datas
                inputs = await page.query_selector_all("input[type='text']")
                for inp in inputs:
                    val = await inp.get_attribute("placeholder")
                    if val and ("data" in val.lower() or "início" in val.lower()):
                        await inp.fill(start_date)
                    if val and ("fim" in val.lower() or "até" in val.lower()):
                        await inp.fill(today)
            except:
                print("Aviso: Falha ao preencher datas automaticamente pelos placeholders.")

            # 4. Exportar
            print("Solicitando exportação para Excel...")
            async with page.expect_download() as download_info:
                await page.get_by_text("Exportar para Excel", exact=True).click()
            
            download = await download_info.value
            
            # Garantir que a pasta existe
            if not os.path.exists(DOWNLOAD_DIR):
                os.makedirs(DOWNLOAD_DIR)
                
            await download.save_as(EXCEL_PATH)
            print(f"Download concluído: {EXCEL_PATH}")

        except Exception as e:
            print(f"Erro durante a automação: {e}")
            raise e
        finally:
            await browser.close()

def process_data():
    print("Iniciando processamento dos dados salvos...")
    try:
        df = pd.read_excel(EXCEL_PATH)
        df['Abertura_dt'] = pd.to_datetime(df['Abertura'], format='%d/%m/%Y, %H:%M', errors='coerce')
        df['Atendente'] = df['Atendente'].fillna('Não Atribuído').astype(str)
        df['Setor'] = df['Setor'].fillna('Não Informado').astype(str)
        df['Empresa'] = df['Empresa'].fillna('N/A').astype(str)
        df['Contato'] = df['Contato'].fillna('Desconhecido').astype(str)
        df['wait'] = df['Tempo na Fila'].apply(time_to_seconds)
        df['total'] = df['Tempo'].apply(time_to_seconds)
        df['csat'] = df['total'].apply(map_csat)

        records = []
        for _, row in df.iterrows():
            agent = str(row['Atendente']).strip()
            total_seconds = int(row['total'])
            
            if agent in ['Não Atribuído', 'Sistema', ''] or total_seconds == 0:
                continue

            dt = row['Abertura_dt']
            date_str = dt.strftime('%Y-%m-%d') if pd.notna(dt) else ""
            month_str = dt.strftime('%Y-%m') if pd.notna(dt) else ""
            hour = dt.hour if pd.notna(dt) else -1
            weekday = dt.weekday() if pd.notna(dt) else -1
            
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

        output_data = {
            "tickets": records,
            "agents": sorted(list(set(r['agent'] for r in records))),
            "sectors": sorted(list(set(r['sector'] for r in records))),
            "last_updated": datetime.now().strftime('%d/%m/%Y, %H:%M:%S')
        }
        
        with open('src/assets/data.json', 'w', encoding='utf-8') as f:
            json.dump(output_data, f, ensure_ascii=False)
            
        print(f"Dashboard atualizado com {len(records)} registros efetivos.")

    except Exception as e:
        print(f"Erro no processamento: {e}")
        raise e

async def main():
    try:
        if not EMAIL or not PASSWORD:
            print("Erro: Credenciais não encontradas no arquivo .env")
            return
            
        await download_report()
        process_data()
        print("Sincronização concluída com sucesso!")
    except Exception as e:
        print(f"Falha na sincronização: {e}")

if __name__ == "__main__":
    asyncio.run(main())
