import os

file_path = r'c:\Users\Lucas.moura\.gemini\antigravity\scratch\san-paolo-itview\src\App.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# We want to remove lines that contain the corruption
# Line 4066 in 1-based is index 4065
# Let's look for the pattern around those indices
start_idx = 4065 # 4066
end_idx = 4068   # 4069

print(f"Checking lines {start_idx} to {end_idx}")
for i in range(start_idx, end_idx + 1):
    if i < len(lines):
        print(f"{i+1}: {repr(lines[i])}")

# Let's find the </tbody> and </table> and remove anything in between
tbody_line = -1
table_line = -1

for i in range(4000, len(lines)):
    if '</tbody>' in lines[i]:
        tbody_line = i
    if '</table>' in lines[i] and tbody_line != -1:
        table_line = i
        break

if tbody_line != -1 and table_line != -1:
    print(f"Found </tbody> at {tbody_line+1} and </table> at {table_line+1}")
    # The garbage is between tbody_line and table_line
    new_lines = lines[:tbody_line+1] + lines[table_line:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("File fixed successfully!")
else:
    print("Could not find tags to fix.")
