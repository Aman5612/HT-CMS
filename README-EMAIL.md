# Email Setup for Blog CMS

This document explains how to set up email sending for user invitations in the Blog CMS.

## Setting Up Resend

The CMS uses [Resend](https://resend.com) to send invitation emails. Resend is a modern email API that's easy to use and offers a generous free tier (100 emails/day).

### Step 1: Create a Resend Account

1. Go to [Resend.com](https://resend.com) and sign up for an account
2. Verify your account by clicking the link in the verification email

### Step 2: Get Your API Key

1. In the Resend dashboard, go to the API Keys section
2. Create a new API key (or use the default one)
3. Copy the API key (it starts with `re_`)

### Step 3: Add API Key to Environment Variables

1. Open your `.env` file in the root directory of the project
2. Find the line `# RESEND_API_KEY=re_123456789`
3. Uncomment it by removing the `#` and replace `re_123456789` with your actual API key
4. Save the file

### Step 4: Configure Sender Email

By default, the invitation emails will be sent from `onboarding@resend.dev`, which is fine for development. For production:

1. Verify your domain in Resend (follow their instructions)
2. Once verified, update the `EMAIL_FROM` variable in `.env` to use your domain (e.g., `invites@yourdomain.com`)

## Testing Email Functionality

To test that emails are working:

1. Start your application server
2. Go to the Users page in the dashboard
3. Click "Invite User" 
4. Enter an email address and role
5. Click "Send Invitation"

If everything is configured correctly, the invitation email should be sent to the specified address.

## Troubleshooting

If emails are not being sent:

1. Check the console logs for any errors
2. Verify that your API key is correct
3. Make sure your Resend account is active
4. Check if you've reached the free tier limit (100 emails/day)

## Email Templates

The invitation email uses a custom HTML template. If you want to modify this template, you can edit the `generateInvitationEmail` function in `app/api/invitations/route.ts`.

## WhatsApp Integration

The CMS is currently configured to send invitations via email only. If you'd like to add WhatsApp integration:

1. Sign up for a WhatsApp Business API provider (like Twilio or MessageBird)
2. Implement the WhatsApp sending logic in a new utility function
3. Call this function from the invitation creation endpoint

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend React Documentation](https://resend.com/docs/send-with-react)
- [Email Template Resources](https://github.com/resendlabs/react-email) 