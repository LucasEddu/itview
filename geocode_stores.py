
import pandas as pd
from geopy.geocoders import Nominatim
import json
import os
import time
import re

excel_path = r'C:\Users\Lucas.moura\Downloads\Dados\dadosBI\Lojas Local.xlsx'
cache_path = 'stores_cache.json'
output_path = 'stores_locations.json'

def extract_city_state(address):
    # Try to find a pattern like "Maceio - AL" or "Salvador - BA"
    # Matches word characters/spaces, hyphen, and exactly 2 uppercase letters
    match = re.search(r'([A-Za-zÀ-ÖØ-öø-ÿ\s]+)\s*-\s*([A-Z]{2})(?:,\s*\d{5}-\d{3})?$', address)
    if match:
        city = match.group(1).strip()
        state = match.group(2).strip()
        # Remove any leading commas or noise from city
        city = city.split(',')[-1].strip()
        return f"{city}, {state}, Brazil"
    
    # Fallback: just split by comma and take the second to last part, hoping it's city/state
    parts = address.split(',')
    if len(parts) >= 2:
        return f"{parts[-2].strip()}, Brazil"
    return "Brazil"

def geocode_stores():
    if not os.path.exists(excel_path):
        print(f"Excel not found at {excel_path}")
        return

    df = pd.read_excel(excel_path)
    cache = {}
    if os.path.exists(cache_path):
        with open(cache_path, 'r', encoding='utf-8') as f:
            cache = json.load(f)

    geolocator = Nominatim(user_agent="itview_geocoder_v4")
    stores_data = []
    
    print(f"Starting geocoding for {len(df)} stores...")
    
    for index, row in df.iterrows():
        name = str(row['Loja Degust']).strip()
        address = str(row['Endereço']).strip()
        
        if address in cache and cache[address]:
            stores_data.append({"name": name, "address": address, "coords": cache[address]})
            continue

        print(f"Geocoding: {name}")
        coords = None
        
        # 1. Try exact address (without zipcode to improve chances)
        query_exact = re.sub(r',\s*\d{5}-\d{3}', '', address)
        try:
            location = geolocator.geocode(f"{query_exact}, Brazil", timeout=10)
            if location:
                coords = [location.latitude, location.longitude]
                print(f"  Exact OK: {coords}")
        except Exception as e:
            print(f"  Exact error: {e}")
            time.sleep(2)
            
        # 2. Try city/state fallback
        if not coords:
            fallback_query = extract_city_state(address)
            print(f"  Trying fallback: {fallback_query}")
            try:
                location = geolocator.geocode(fallback_query, timeout=10)
                if location:
                    coords = [location.latitude, location.longitude]
                    print(f"  Fallback OK: {coords}")
            except Exception as e:
                print(f"  Fallback error: {e}")
                time.sleep(2)
                
        # 3. Ultimate fallback (just the state or capital if parsing completely fails)
        if not coords:
            state_match = re.search(r'-\s*([A-Z]{2})', address)
            if state_match:
                state = state_match.group(1)
                try:
                    location = geolocator.geocode(f"{state}, Brazil", timeout=10)
                    if location:
                        coords = [location.latitude, location.longitude]
                        print(f"  State OK: {coords}")
                except Exception:
                    pass
        
        if coords:
            cache[address] = coords
            stores_data.append({"name": name, "address": address, "coords": coords})
        else:
            print(f"  FAILED to geocode: {name}")
            # If completely failed, default to center of Brazil just so it renders
            coords = [-14.235, -51.925]
            cache[address] = coords
            stores_data.append({"name": name, "address": address, "coords": coords})
            
        # Save cache and output incrementally
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(stores_data, f, ensure_ascii=False, indent=2)

        time.sleep(1.5) # Rate limit respect

if __name__ == "__main__":
    geocode_stores()
    print("Geocoding complete.")
