# Crucible MVP Deployment Guide

This guide covers deploying Crucible to AWS Lambda for your MVP.

## Quick Start: AWS Lambda Deployment

### 1. Prerequisites

- **AWS Account** with appropriate permissions
- **AWS CLI** installed and configured
- **Node.js** (v16 or higher)
- **Serverless Framework** installed globally

```bash
# Install Serverless Framework
npm install -g serverless

# Verify installation
serverless --version
```

### 2. Setup AWS Credentials

```bash
# Configure AWS CLI
aws configure

# Enter your:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (e.g., us-east-1)
# - Default output format (json)
```

### 3. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install crucible-core dependencies
cd ../crucible-core
npm install
cd ../backend
```

### 4. Environment Variables

Create a `.env` file in the root directory with your API keys:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# DeepSeek Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
```

### 5. Deploy to AWS

```bash
# Deploy to dev environment
npm run deploy

# Deploy to production
npm run deploy:prod
```

### 6. Test Your Deployment

After deployment, you'll get a URL like:
`https://xxxxx.execute-api.us-east-1.amazonaws.com/dev`

Test the endpoints:

```bash
# Test providers endpoint
curl https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/providers

# Test query endpoint
curl -X POST https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/query \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is the capital of France?"}'
```

## Configuration Options

### Environment Variables in AWS

You can set environment variables in the AWS Lambda console or via the Serverless Framework:

```yaml
# In serverless.yml
provider:
  environment:
    OPENAI_API_KEY: ${env:OPENAI_API_KEY}
    DEEPSEEK_API_KEY: ${env:DEEPSEEK_API_KEY}
    DEEPSEEK_API_URL: ${env:DEEPSEEK_API_URL, 'https://api.deepseek.com/v1'}
```

### Lambda Configuration

The current configuration:
- **Runtime**: Node.js 18.x
- **Memory**: 512 MB
- **Timeout**: 30 seconds
- **Region**: us-east-1 (configurable)

### Custom Domain (Optional)

To use a custom domain:

1. **Register a domain** in Route 53
2. **Create a certificate** in AWS Certificate Manager
3. **Update serverless.yml**:

```yaml
custom:
  customDomain:
    domainName: api.yourdomain.com
    stage: ${self:provider.stage}
    createRoute53Record: true
```

## Cost Optimization

### Lambda Pricing

- **Free tier**: 1M requests/month, 400,000 GB-seconds/month
- **Pay per use**: $0.20 per 1M requests + $0.0000166667 per GB-second

### Optimization Tips

1. **Memory allocation**: 512MB is sufficient for most queries
2. **Timeout**: 30 seconds should be enough for AI responses
3. **Cold starts**: Consider using provisioned concurrency for production

## Monitoring and Logs

### CloudWatch Logs

All Lambda executions are logged in CloudWatch:

```bash
# View logs
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/crucible-backend"

# Get recent logs
aws logs tail /aws/lambda/crucible-backend-dev-api --follow
```

### Metrics to Monitor

- **Invocation count**
- **Error rate**
- **Duration**
- **Throttles**

## Security Considerations

### API Keys

- Store API keys in AWS Systems Manager Parameter Store
- Use IAM roles with minimal permissions
- Rotate keys regularly

### CORS Configuration

The API is configured with CORS enabled. For production, restrict origins:

```javascript
// In app.js
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com']
}));
```

## Troubleshooting

### Common Issues

1. **"Missing Authentication Token"**
   - Check if the Lambda function is deployed correctly
   - Verify the API Gateway configuration

2. **Environment variables not loading**
   - Ensure variables are set in AWS Lambda console
   - Check the lambda.js file path configuration

3. **Timeout errors**
   - Increase the timeout in serverless.yml
   - Check if AI providers are responding slowly

4. **Memory errors**
   - Increase memory allocation in serverless.yml
   - Check for memory leaks in the code

### Debugging

```bash
# Test locally with serverless-offline
npm run dev

# Check Lambda logs
serverless logs -f api -t

# Remove deployment for clean slate
npm run remove
```

## Next Steps for MVP

### 1. Frontend Integration

Create a simple frontend to interact with your API:

```javascript
// Example frontend code
const response = await fetch('https://your-api-url/dev/query-and-synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: userInput })
});
```

### 2. Rate Limiting

Add rate limiting to prevent abuse:

```javascript
// Add to app.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

### 3. Authentication

Add API key authentication for production:

```javascript
// Add to app.js
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.use(apiKeyAuth);
```

## Support

For deployment issues:
1. Check the AWS Lambda console for error details
2. Review CloudWatch logs
3. Test locally with serverless-offline
4. Verify environment variables are set correctly 