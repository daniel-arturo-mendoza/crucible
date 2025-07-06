# Push Notifications for Mobile App

This document explains how to set up and use push notifications for the Crucible mobile app.

## Overview

The push notification system uses **Firebase Cloud Messaging (FCM)** to send real-time notifications to mobile devices when AI responses are ready.

## Architecture

```
Mobile App → FCM Token Registration → Backend
    ↓
Backend → AI Processing → Response Router
    ↓
Response Router → Push Notification Service → FCM → Mobile App
```

## Setup Instructions

### 1. Firebase Project Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project or use existing one
   - Enable Cloud Messaging

2. **Download Service Account Key**
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

3. **Set Environment Variable**
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project",...}'
   ```

### 2. Mobile App Integration

#### iOS Setup
1. Add Firebase SDK to your iOS app
2. Configure `GoogleService-Info.plist`
3. Request notification permissions
4. Get FCM token and send to backend

#### Android Setup
1. Add Firebase SDK to your Android app
2. Configure `google-services.json`
3. Request notification permissions
4. Get FCM token and send to backend

## API Endpoints

### Register FCM Token
```http
POST /mobile/register-token
Content-Type: application/json

{
  "userId": "user123",
  "fcmToken": "fcm-token-from-device",
  "appVersion": "1.0.0",
  "deviceId": "device-123",
  "platform": "ios"
}
```

### Update Push Preferences
```http
POST /mobile/push-preferences
Content-Type: application/json

{
  "userId": "user123",
  "enabled": true
}
```

### Unregister Token
```http
DELETE /mobile/unregister-token
Content-Type: application/json

{
  "userId": "user123"
}
```

## Mobile App Flow

### 1. App Startup
```javascript
// Get FCM token from device
const fcmToken = await getFCMTokenFromDevice();

// Register with backend
await fetch('/mobile/register-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    fcmToken: fcmToken,
    appVersion: '1.0.0',
    deviceId: 'device-123',
    platform: 'ios'
  })
});
```

### 2. Submit Question
```javascript
// Submit question (same as before)
const response = await fetch('/mobile/question', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    prompt: 'What is AI?'
  })
});

const { jobId } = await response.json();
// Store jobId for reference
```

### 3. Handle Push Notification
```javascript
// In your push notification handler
function handlePushNotification(notification) {
  const { jobId, type, prompt, response } = notification.data;
  
  if (type === 'job_completion') {
    // Navigate to response screen
    navigateToResponse(jobId, response);
  } else if (type === 'job_error') {
    // Show error message
    showError('Sorry, there was an error processing your question');
  }
}
```

## Notification Types

### Job Completion
```json
{
  "title": "🤖 Crucible AI Response",
  "body": "Your question about \"What is AI?\" is ready!",
  "data": {
    "type": "job_completion",
    "jobId": "job-123",
    "prompt": "What is AI?",
    "response": "Artificial Intelligence (AI) is...",
    "channel": "mobile"
  }
}
```

### Job Error
```json
{
  "title": "❌ Crucible AI Error",
  "body": "Sorry, there was an error processing your question.",
  "data": {
    "type": "job_error",
    "jobId": "job-123",
    "prompt": "What is AI?",
    "error": "AI processing timeout",
    "channel": "mobile"
  }
}
```

## Testing

### Run Push Notification Tests
```bash
cd backend
node test-push-notifications.js
```

### Test Firebase Configuration
```bash
# Check if Firebase is properly configured
node -e "
const PushNotificationService = require('./src/services/pushNotification');
const service = new PushNotificationService();
console.log('Firebase available:', service.isAvailable());
"
```

## Error Handling

### Invalid FCM Tokens
- Backend automatically removes invalid tokens
- App should re-register token when app starts
- Handle token refresh in mobile app

### Network Issues
- Push notifications are best-effort
- App can still poll `/mobile/job/:jobId` as fallback
- Consider retry logic for failed notifications

## Security Considerations

1. **FCM Token Storage**: Tokens are stored in DynamoDB with TTL
2. **User Verification**: Verify user owns the job before sending notifications
3. **Token Validation**: Remove invalid tokens automatically
4. **Rate Limiting**: Consider rate limiting for token registration

## Monitoring

### CloudWatch Metrics
- Push notification success/failure rates
- FCM token registration counts
- Job completion notification delays

### Logs
- FCM token registration events
- Push notification delivery status
- Invalid token removals

## Troubleshooting

### Common Issues

1. **Firebase not initialized**
   - Check `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable
   - Verify service account key format

2. **Push notifications not received**
   - Check device FCM token is valid
   - Verify app has notification permissions
   - Check user's push notification preferences

3. **Invalid token errors**
   - App should re-register token
   - Backend automatically removes invalid tokens

### Debug Commands
```bash
# Check Firebase configuration
node test-push-notifications.js

# Test specific user
curl -X POST http://localhost:3000/mobile/register-token \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","fcmToken":"test-token"}'

# Check user data
curl http://localhost:3000/mobile/jobs/test
```

## Future Enhancements

1. **Rich Notifications**: Include response preview in notification
2. **Notification Groups**: Group related notifications
3. **Silent Notifications**: Update app state without user interaction
4. **Custom Sounds**: App-specific notification sounds
5. **Notification Actions**: Quick reply or dismiss actions 