# Fine Line Projects enquiry chatbot deployment

The browser sends chatbot enquiries to the same-origin Cloudflare Pages route
`/api/enquiries`. The Pages Function checks the request origin and rate limit,
then forwards the JSON to the Apps Script web app. Apps Script validates the
submission again and appends a row to the private spreadsheet. The browser only
shows a success state after it receives and validates the enquiry ID.

The spreadsheet ID is configured in `Code.gs`. No spreadsheet access token or
Apps Script URL is included in client-side code.

## 1. Prepare Google Sheets

1. Sign in to the Google account that owns or can edit the specified spreadsheet.
2. Open the spreadsheet with ID `1jjMMNX_0TmwtSWXMmUg2XlEvUqZ7aPAYDrUs6-pxk3M`.
3. Keep the spreadsheet private; do not enable public viewing or editing.

## 2. Install and initialize Apps Script

1. Open [Google Apps Script](https://script.google.com/) and create a project.
2. Replace the contents of `Code.gs` with the repository's
   `google-apps-script/Code.gs`.
3. Confirm `SPREADSHEET_ID` is set to the supplied ID. It is already set in the
   checked-in file; do not substitute the spreadsheet's full URL.
4. Choose `setupCustomerEnquiries` in the function selector and click **Run**.
5. Review and grant the requested Google Sheets permissions.
6. Confirm a `Customer Enquiries` tab exists with the 13 required headers.
   Setup preserves existing rows and stops without changing data if an existing
   header row does not match.

## 3. Deploy the Apps Script web app

1. In Apps Script, choose **Deploy → New deployment → Web app**.
2. Set **Execute as** to **Me**.
3. Set access to **Anyone** if this is a public website. This allows website
   visitors to submit without granting them access to spreadsheet records:
   `doGet` exposes only API status, and `doPost` only appends validated data.
4. Deploy, complete any authorization prompt, and copy the deployment URL that
   ends in `/exec`.
5. Do not use the Google Sheets URL in place of this Apps Script deployment URL.

The supplied web app deployment is:
`https://script.google.com/macros/s/AKfycbxik8xZ7h9cbTr9CPaO1fDEG4ySo0zTqc9nHMhql13CShHp7J14lpujBzzv2mV-yO7u1Q/exec`

## 4. Configure Cloudflare Pages

This site uses a same-origin Pages Function as a server-side proxy, avoiding
browser CORS and keeping the Apps Script URL out of the frontend.

1. Deploy this project to Cloudflare Pages with the repository root (`.`) as
   the build output directory and Wrangler configuration enabled.
2. Keep `functions/api/enquiries.js` in the repository so Pages deploys the
   `/api/enquiries` route.
3. Add a production secret named `APPS_SCRIPT_URL` in the Pages project's
   **Settings → Variables and Secrets**. Set its value to the supplied Apps
   Script `/exec` URL above. The existing deployment ID is
   `AKfycbxik8xZ7h9cbTr9CPaO1fDEG4ySo0zTqc9nHMhql13CShHp7J14lpujBzzv2mV-yO7u1Q`.
   Do not put the URL into browser JavaScript or commit it as an application
   secret.
4. The root `wrangler.jsonc` configures the `ENQUIRY_RATE_LIMIT` binding at five
   submissions per IP per minute. If namespace ID `1001` is already used by
   another binding in your Cloudflare account, change it to an unused numeric
   namespace ID before deployment.
5. Deploy the Pages project. The browser endpoint is `/api/enquiries`; no
   frontend URL needs to be edited.

For a CLI deployment, install Wrangler in your local development environment,
authenticate to the intended Cloudflare account, add the secret with
`npx wrangler pages secret put APPS_SCRIPT_URL --project-name fine-line-projects`,
then publish from the repository root with
`npx wrangler pages deploy . --project-name fine-line-projects`. Confirm that
the deployment output includes the `functions/api/enquiries.js` Function.
Keep the secret value out of terminal logs and source control.

### Troubleshooting HTTP 405

The browser sends a POST request to the same-origin `/api/enquiries` route.
An HTTP 405 with a non-JSON response means the website host rejected that
request before the Pages Function ran. Deploy the website to Cloudflare Pages
with Functions enabled and `functions/api/enquiries.js` included in the
deployment. Publishing only the static HTML/CSS/JavaScript files to a
static-only host does not deploy this API route. After deploying, check that
`POST https://<your-site>/api/enquiries` returns JSON; then verify the
`APPS_SCRIPT_URL` secret is set in that Pages environment.

## 5. Verify the live integration

1. On the deployed HTTPS website, open the chatbot and complete an enquiry
   using consent you are authorized to give.
2. Confirm the UI displays a generated `FLP-YYYYMMDD-XXXXXXXX` enquiry ID only
   after submission is confirmed.
3. Confirm exactly one corresponding `NEW` row appears in the private
   `Customer Enquiries` tab, with date and time in Asia/Kolkata.
4. Retry a request after a simulated lost response using the same chatbot
   session; Apps Script's idempotency key should return the original enquiry ID.
5. Verify missing consent and invalid fields are rejected, the honeypot is not
   accepted, and the Cloudflare rate limit returns an error instead of success.

Until both Apps Script and Cloudflare are deployed and this live check passes,
the chatbot intentionally reports an error and preserves the visitor's details;
the frontend does not simulate a successful Google Sheets submission.
