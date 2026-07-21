"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const file_utils_1 = require("../src/lib/file-utils");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Mock base64 image (tiny red dot)
const mockBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';
const filename = (0, file_utils_1.saveBase64Image)(mockBase64, 'test-avatar');
console.log('Generated filename:', filename);
if (filename) {
    const filePath = path_1.default.join(__dirname, '../uploads/images', filename);
    if (fs_1.default.existsSync(filePath)) {
        console.log('SUCCESS: File exists at', filePath);
        // Cleanup
        fs_1.default.unlinkSync(filePath);
        console.log('Cleanup done.');
    }
    else {
        console.error('FAILURE: File not found at', filePath);
    }
}
else {
    console.error('FAILURE: saveBase64Image returned null');
}
//# sourceMappingURL=test_image_save.js.map