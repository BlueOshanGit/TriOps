const { getValueByPath } = require('../services/webhookDispatcher');

const testData = {
    user: {
        id: 1,
        profile: {
            name: 'John Doe',
            emails: ['john@example.com', 'doe@example.com']
        }
    },
    items: [
        { id: 'a', values: [10, 20] },
        { id: 'b', values: [30, 40] }
    ],
    deeply: {
        nested: {
            arrays: [
                [1, 2],
                [3, 4]
            ]
        }
    }
};

const testCases = [
    { path: 'user.id', expected: 1 },
    { path: 'user.profile.name', expected: 'John Doe' },
    { path: 'user.profile.emails[0]', expected: 'john@example.com' },
    { path: 'items[1].id', expected: 'b' },
    { path: 'items[0].values[1]', expected: 20 },
    { path: 'deeply.nested.arrays[1][0]', expected: 3 },
    { path: 'nonexistent.path', expected: undefined },
    { path: 'user.profile.emails[5]', expected: undefined }
];

let failed = false;

testCases.forEach(({ path, expected }) => {
    const result = getValueByPath(testData, path);
    if (result === expected) {
        console.log(`✅ PASSED: "${path}" -> ${JSON.stringify(result)}`);
    } else {
        console.error(`❌ FAILED: "${path}". Expected ${JSON.stringify(expected)}, got ${JSON.stringify(result)}`);
        failed = true;
    }
});

if (failed) {
    process.exit(1);
} else {
    console.log('\nAll JSON path extraction tests passed!');
}
