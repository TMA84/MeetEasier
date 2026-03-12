const fs = require('fs');

const filePath = 'ui-react/src/components/admin/Admin.js';
const replacementFile = 'touchkio-ui-replacement.txt';

console.log('Reading files...');
let content = fs.readFileSync(filePath, 'utf8');
const replacement = fs.readFileSync(replacementFile, 'utf8');

// Find the modal section
const startMarker = '{this.state.showTouchkioModal && this.state.touchkioModalDisplay && (';
const endMarker = '</div>\n                </div>\n              )}';

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
  console.error('Could not find modal start marker');
  process.exit(1);
}

// Find the end of the modal (look for the closing tags)
let searchStart = startIndex;
let endIndex = -1;
let depth = 0;
let inModal = false;

// Find the complete modal structure
for (let i = startIndex; i < content.length; i++) {
  const remaining = content.substring(i);
  
  if (remaining.startsWith('{this.state.showTouchkioModal')) {
    inModal = true;
  }
  
  if (inModal) {
    if (remaining.startsWith('<div')) {
      depth++;
    } else if (remaining.startsWith('</div>')) {
      depth--;
      if (depth === 0 && remaining.startsWith('</div>\n                </div>\n              )}')) {
        endIndex = i + '</div>\n                </div>\n              )}'.length;
        break;
      }
    }
  }
}

if (endIndex === -1) {
  console.error('Could not find modal end');
  process.exit(1);
}

console.log(`Found modal from position ${startIndex} to ${endIndex}`);
console.log(`Modal length: ${endIndex - startIndex} characters`);

// Extract before and after
const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

// Build new content
const newContent = before + replacement.trim() + after;

// Write back
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ Modal successfully replaced!');
console.log(`New file size: ${newContent.length} characters`);
