const fs = require('fs');
const readline = require('readline');

async function extractLogs() {
  const fileStream = fs.createReadStream('C:\\Users\\comfo\\.gemini\\antigravity-ide\\brain\\532d8e55-06af-490c-b4cd-4e4a12a606d3\\.system_generated\\logs\\transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('--- SCANNING TRANSCRIPT FOR BROWSER CONSOLE LOGS ---');
  for await (const line of rl) {
    if (line.includes('capture_browser_console_logs') || line.includes('CONSOLE') || line.includes('console_logs')) {
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
          console.log(`Step ${obj.step_index} Tool Call:`, JSON.stringify(obj.tool_calls));
        }
        if (obj.type === 'VIEW_FILE' || obj.type === 'RUN_COMMAND' || obj.content) {
          // If this is the response or output containing the console log results
          if (obj.content && (obj.content.includes('error') || obj.content.includes('warn') || obj.content.includes('Console') || obj.content.includes('crashed'))) {
            console.log(`Step ${obj.step_index} Content:`, obj.content.slice(0, 1000));
          }
        }
      } catch (e) {
        // Line might be truncated or invalid JSON
      }
    }
  }
  console.log('--- END OF SCAN ---');
}

extractLogs();
