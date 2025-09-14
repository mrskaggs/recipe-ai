// Test script for Recipe API
// Usage: node test-api.js [API_BASE_URL]
// Example: node test-api.js http://localhost:3001

const http = require('http');
const https = require('https');

const API_BASE_URL = process.argv[2] || 'http://192.168.40.142:3001/';

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/health`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    return response.status === 200;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testGetRecipes() {
  console.log('\n📋 Testing GET /api/recipes...');
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/recipes`);
    console.log(`Status: ${response.status}`);
    console.log(`Found ${response.data.length || 0} recipes`);
    if (response.data.length > 0) {
      console.log('First recipe:', response.data[0]);
    }
    return response.status === 200;
  } catch (error) {
    console.error('❌ GET recipes failed:', error.message);
    return false;
  }
}

async function testCreateRecipe() {
  console.log('\n➕ Testing POST /api/recipes...');
  
  const testRecipe = [{
    "output": {
      "title": "Test Recipe from API Test",
      "servings": 2,
      "ingredients": [
        "1 cup test ingredient",
        "2 tbsp test seasoning",
        "1 test protein source"
      ],
      "instructions": [
        "Prepare test ingredients",
        "Mix everything together",
        "Cook until done",
        "Serve and enjoy"
      ],
      "macros_per_serving": {
        "calories": 350,
        "protein_g": 25.5,
        "carbs_g": 30.2,
        "fat_g": 12.8
      },
      "tags": [
        "test",
        "api-test",
        "quick"
      ],
      "notes": "This is a test recipe created by the API test script"
    }
  }];

  try {
    const response = await makeRequest(`${API_BASE_URL}/api/recipes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testRecipe)
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    return response.status === 201;
  } catch (error) {
    console.error('❌ POST recipe failed:', error.message);
    return false;
  }
}

async function testGetSingleRecipe(recipeId = 1) {
  console.log(`\n🔍 Testing GET /api/recipes/${recipeId}...`);
  try {
    const response = await makeRequest(`${API_BASE_URL}/api/recipes/${recipeId}`);
    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log('Recipe details:', response.data);
    } else {
      console.log('Response:', response.data);
    }
    return response.status === 200 || response.status === 404;
  } catch (error) {
    console.error('❌ GET single recipe failed:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log(`🚀 Starting API tests for: ${API_BASE_URL}`);
  console.log('=' .repeat(50));
  
  const results = {
    healthCheck: await testHealthCheck(),
    getRecipes: await testGetRecipes(),
    createRecipe: await testCreateRecipe(),
    getSingleRecipe: await testGetSingleRecipe()
  };
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results:');
  console.log('=' .repeat(50));
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! API is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the API deployment and database connection.');
  }
}

// Run the tests
runTests().catch(console.error);
