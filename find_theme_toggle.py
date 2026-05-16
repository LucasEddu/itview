with open("src/App.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "theme" in line.lower() or "toggle" in line.lower():
        print(f"Line {idx+1}: {line.strip()}")
