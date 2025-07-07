#!/usr/bin/env node

// Simple script to test deployment endpoints
const baseUrls = [
  "http://localhost:8080", // Local development
  "https://qq-new1.netlify.app", // Production deployment
];

const endpoints = ["/api/ping", "/api/health", "/api/debug"];

async function testEndpoint(baseUrl, endpoint) {
  try {
    console.log(`Testing ${baseUrl}${endpoint}...`);
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${endpoint}: Success`, data);
    } else {
      console.log(
        `❌ ${endpoint}: HTTP ${response.status}`,
        await response.text(),
      );
    }
  } catch (error) {
    console.log(`❌ ${endpoint}: Error`, error.message);
  }
}

async function runTests() {
  for (const baseUrl of baseUrls) {
    console.log(`\n=== Testing ${baseUrl} ===`);
    for (const endpoint of endpoints) {
      await testEndpoint(baseUrl, endpoint);
      // Wait a bit between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };
