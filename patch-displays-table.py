#!/usr/bin/env python3

# Read files
with open('ui-react/src/components/admin/Admin.js', 'r') as f:
    content = f.read()

with open('merged-displays-table.txt', 'r') as f:
    replacement = f.read()

# Find the table section
start_marker = ") : (\n                <div className=\"admin-displays-table-wrapper\">"
end_marker = "              )}\n\n              <div className=\"admin-form-divider\"></div>\n\n              <h3>{t.systemDisplayTrackingSectionTitle"

start_idx = content.find(start_marker)
if start_idx == -1:
    print("ERROR: Could not find start marker")
    exit(1)

end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print("ERROR: Could not find end marker")
    exit(1)

print(f"Found table from {start_idx} to {end_idx}")

# Replace
new_content = content[:start_idx] + replacement + "\n\n              <div className=\"admin-form-divider\"></div>\n\n              <h3>{t.systemDisplayTrackingSectionTitle" + content[end_idx + len(end_marker):]

# Write back
with open('ui-react/src/components/admin/Admin.js', 'w') as f:
    f.write(new_content)

print("✅ Table successfully replaced!")
