# WhatsApp Integration with Crucible Lambda

This document explains how to use the Twilio WhatsApp integration with your Crucible Lambda backend.

## Setup

### 1. Environment Variables

Add these environment variables to your deployment:

```bash
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Note:** The `TWILIO_WHATSAPP_NUMBER` should be your Twilio WhatsApp-enabled number with the `whatsapp:` prefix.

### 2. Twilio Console Configuration

1. Log into [Twilio Console](https://console.twilio.com/)
2. Go to Messaging → Try it out → Send a WhatsApp message
3. Follow the setup instructions to enable WhatsApp messaging
4. Note your WhatsApp-enabled phone number

## API Endpoints

### 1. Send Simple WhatsApp Message

**Endpoint:** `POST /whatsapp/send`

**Request Body:**
```json
{
  "to": "+1234567890",
  "message": "Hello from Crucible!"
}
```

**Response:**
```json
{
  "success": true,
  "messageSid": "SM...",
  "message": "WhatsApp message sent successfully"
}
```

### 2. Send WhatsApp Message with Crucible AI Response

**Endpoint:** `POST /whatsapp/crucible`

**Request Body:**
```json
{
  "to": "+1234567890",
  "prompt": "What is the capital of France?",
  "providers": ["openai", "deepseek"],
  "synthesize": true
}
```

**Parameters:**
- `to` (required): Recipient phone number in international format
- `prompt` (required): The question/prompt for Crucible AI
- `providers` (optional): Array of AI providers to use (default: `["openai", "deepseek"]`)
- `synthesize` (optional): Whether to synthesize responses (default: `true`)

**Response:**
```json
{
  "success": true,
  "messageSid": "SM...",
  "crucibleResponse": {
    "synthesized": "The capital of France is Paris...",
    "responses": {
      "openai": { "content": "..." },
      "deepseek": { "content": "..." }
    }
  },
  "message": "WhatsApp message with Crucible AI response sent successfully"
}
```

### 3. Webhook for Incoming WhatsApp Messages

**Endpoint:** `POST /whatsapp/webhook`

This endpoint automatically processes incoming WhatsApp messages and responds with Crucible AI.

**Setup in Twilio Console:**
1. Go to Messaging → Settings → WhatsApp sandbox
2. Set the webhook URL to: `https://your-lambda-url.com/whatsapp/webhook`
3. Set the HTTP method to POST

**How it works:**
- When someone sends a WhatsApp message to your Twilio number
- Twilio sends the message to your webhook endpoint
- Your Lambda processes the message with Crucible AI
- The response is automatically sent back to the sender

## Testing

### Local Testing

1. Set your environment variables in a `.env` file:
```bash
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

2. Start the local server:
```bash
cd backend
npm run dev
```

3. Test the endpoints:
```bash
# Send simple message
curl -X POST http://localhost:3000/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Test message"}'

# Send with Crucible AI
curl -X POST http://localhost:3000/whatsapp/crucible \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "prompt": "What is AI?"}'
```

### Production Testing

1. Deploy your Lambda:
```bash
cd backend
npm run deploy
```

2. Test with your deployed URL:
```bash
curl -X POST https://your-lambda-url.com/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Test message"}'
```

## Error Handling

The integration includes comprehensive error handling:

- **Invalid phone numbers**: Returns 400 error with validation message
- **Missing Twilio credentials**: Returns 500 error with configuration message
- **Twilio API errors**: Logged and returned with appropriate error messages
- **Crucible AI errors**: Handled gracefully with user-friendly error messages

## Security Notes

- Never commit your Twilio credentials to version control
- Use environment variables for all sensitive configuration
- The webhook endpoint validates incoming requests but doesn't verify Twilio signatures (add this for production use)
- Phone numbers are validated for proper international format

## Troubleshooting

### Common Issues

1. **"Twilio is not properly configured"**
   - Check that all three environment variables are set
   - Verify your Twilio credentials are correct

2. **"Invalid phone number format"**
   - Ensure phone numbers include country code (e.g., `+1234567890`)
   - Don't include spaces or special characters

3. **Webhook not receiving messages**
   - Verify the webhook URL is correctly set in Twilio Console
   - Check that your Lambda is publicly accessible
   - Ensure the webhook endpoint is set to POST method

4. **Messages not being delivered**
   - Check Twilio Console for message status
   - Verify the recipient number is in the correct format
   - Ensure your Twilio account has sufficient credits

### Debugging

Enable detailed logging by checking the Lambda CloudWatch logs for:
- Environment variable loading status
- Twilio API calls and responses
- Crucible AI processing logs
- Webhook incoming message details 