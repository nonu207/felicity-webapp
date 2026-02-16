module.exports = {
    testEnvironment: 'node',
    testTimeout: 30000,
    verbose: true,
    silent: false, // Show console logs during tests
    setupFilesAfterEnv: ['./tests/setup.js'],
};
