#!/usr/bin/env python3

with open('ui-react/src/components/admin/Admin.js', 'r') as f:
    content = f.read()

# Find and remove the Touchkio Displays section from MQTT tab
start_marker = '<div className="admin-form-divider"></div>\n\n              <h3>{t.mqttDisplaysSectionTitle || \'Touchkio Displays\'}</h3>'
end_marker = '              </div>\n              )}\n\n              {/* Touchkio Details Modal */'

start_idx = content.find(start_marker)
if start_idx == -1:
    print("ERROR: Could not find start marker")
    exit(1)

end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print("ERROR: Could not find end marker")
    exit(1)

print(f"Found Touchkio Displays section from {start_idx} to {end_idx}")

# Remove the section
new_content = content[:start_idx] + '\n              {/* Touchkio Details Modal */' + content[end_idx + len(end_marker):]

with open('ui-react/src/components/admin/Admin.js', 'w') as f:
    f.write(new_content)

print("✅ Touchkio Displays list removed from MQTT tab!")
