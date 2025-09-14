// Simple API test without SSL issues
const http = require('http');

const API_BASE_URL = process.argv[2] || 'http://localhost:3001';

console.log(`Testing API at: ${API_BASE_URL}`);

// Simple HTTP request function
function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE_URL}${path}`;
    console.log(`\nTesting: ${url}`);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
          const jsonData = JSON.parse(data);
          console.log('Response:', jsonData);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          console.log('Response:', data);
          resolve({ status: res.statusCode, data: data });
        }
      });
    }).on('error', (err) => {
      console.error(`Error: ${err.message}`);
      reject(err);
    });
  });
}

// Run tests
async function runTests() {
  try {
    console.log('='.repeat(50));
    console.log('🚀 Simple API Test');
    console.log('='.repeat(50));
    
    // Test health endpoint
    await testEndpoint('/health');
    
    // Test recipes endpoint
    await testEndpoint('/api/recipes');
    
    console.log('\n✅ Tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if containers are running in Portainer');
    console.log('2. Verify the URL is correct');
    console.log('3. Make sure port 3001 is accessible');
  }
}

runTests();
