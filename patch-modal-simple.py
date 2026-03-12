#!/usr/bin/env python3

# Read the files
with open('ui-react/src/components/admin/Admin.js', 'r') as f:
    content = f.read()

with open('touchkio-ui-replacement.txt', 'r') as f:
    replacement = f.read()

# Find line 6360 (0-indexed = 6359)
lines = content.split('\n')

# Find the start: line with "Touchkio Details Modal"
start_line = None
for i, line in enumerate(lines):
    if 'Touchkio Details Modal' in line:
        start_line = i + 1  # Next line after comment
        break

if start_line is None:
    print("ERROR: Could not find start marker")
    exit(1)

# Find the end: look for the closing after admin-modal-footer
end_line = None
for i in range(start_line, len(lines)):
    if 'admin-modal-footer' in lines[i]:
        # Find the closing tags after this
        for j in range(i, min(i + 10, len(lines))):
            if lines[j].strip() == ')}' and j > i + 3:
                end_line = j
                break
        if end_line:
            break

if end_line is None:
    print("ERROR: Could not find end marker")
    exit(1)

print(f"Replacing lines {start_line + 1} to {end_line + 1}")
print(f"Old modal: {end_line - start_line + 1} lines")

# Replace
new_lines = lines[:start_line] + replacement.strip().split('\n') + lines[end_line + 1:]

# Write back
with open('ui-react/src/components/admin/Admin.js', 'w') as f:
    f.write('\n'.join(new_lines))

print("✅ Modal successfully replaced!")
print(f"New modal: {len(replacement.strip().split(chr(10)))} lines")
