const { execSync } = require('child_process');

module.exports = async () => {
  try {
    // Shut down DynamoDB local (Docker Compose)
    execSync('docker-compose down', { stdio: 'inherit', cwd: __dirname + '/../' });
    console.log('✅ DynamoDB (docker-compose) shut down after tests.');
  } catch (e) {
    console.warn('⚠️  Could not shut down DynamoDB (docker-compose). It may not have been running.');
  }
}; 