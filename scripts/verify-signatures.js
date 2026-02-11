const crypto = require('crypto');
const { verifySignatureV3 } = require('../middleware/hubspotSignature');

// Mock data
const clientSecret = 'test-secret';
const method = 'POST';
const uri = 'https://example.com/webhook';
const requestBody = JSON.stringify({ eventType: 'contact.creation', portalId: 12345 });
const timestamp = Date.now().toString();

// Generate expected signature
const sourceString = method + uri + requestBody + timestamp;
const expectedSignature = crypto
    .createHmac('sha256', clientSecret)
    .update(sourceString)
    .digest('base64');

console.log('Testing Signature V3...');
console.log('Timestamp:', timestamp);
console.log('Expected Signature:', expectedSignature);

const result = verifySignatureV3(expectedSignature, clientSecret, method, uri, requestBody, timestamp);

if (result.valid) {
    console.log('✅ Signature verification PASSED');
} else {
    console.error('❌ Signature verification FAILED:', result.reason);
    process.exit(1);
}

// Test with wrong secret
const wrongResult = verifySignatureV3(expectedSignature, 'wrong-secret', method, uri, requestBody, timestamp);
if (!wrongResult.valid) {
    console.log('✅ Rejection with wrong secret PASSED');
} else {
    console.error('❌ Rejection with wrong secret FAILED');
    process.exit(1);
}
