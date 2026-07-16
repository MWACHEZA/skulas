import { saveBase64Image } from '../src/lib/file-utils';
import fs from 'fs';
import path from 'path';

// Mock base64 image (tiny red dot)
const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

const filename = saveBase64Image(mockBase64, 'test-avatar');
console.log('Generated filename:', filename);

if (filename) {
  const filePath = path.join(__dirname, '../uploads/images', filename);
  if (fs.existsSync(filePath)) {
    console.log('SUCCESS: File exists at', filePath);
    // Cleanup
    fs.unlinkSync(filePath);
    console.log('Cleanup done.');
  } else {
    console.error('FAILURE: File not found at', filePath);
  }
} else {
  console.error('FAILURE: saveBase64Image returned null');
}
