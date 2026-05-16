with open("src/App.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "settheme" in line.lower() or "theme" in line.lower():
        print(f"Line {idx+1}: {line.strip()}")
