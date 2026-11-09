# Cake Order Management System

An integrated order-management project that combines a customer-facing web application with n8n automation, PostgreSQL data storage, Cloudflare R2 image storage, Google Sheets synchronization, and Telegram/WhatsApp notifications.

## Project Structure

```text
cake-order-management-system/
├── README.md
├── web-app/
│   ├── index.html
│   ├── edit-order.html
│   ├── css/
│   ├── js/
│   ├── database/
│   │   └── schema.sql
│   ├── n8n-workflows/
│   │   ├── API-CONTRACT.md
│   │   ├── 01-create-order-with-orders.json
│   │   ├── 02-get-order.json
│   │   ├── 03-update-order.json
│   │   └── legacy-google-sheets/
│   ├── tests/
│   ├── package.json
│   └── README.md
└── automation-workflows/
    └── n8n/
        ├── add-order.json
        ├── search-order.json
        ├── update-and-redirect.json
        ├── create-telegram-group.json
        ├── send-telegram-create-sheet.json
        └── README.md
```

## Main Components

### 1. Web Application

The frontend provides two main pages:

- **Create Order** — customer order form with product details, add-ons, delivery information, pricing, and image uploads.
- **Search & Edit Order** — retrieve an existing order, view its details and images, and submit updates.

The frontend uses JavaScript modules and sends order data and image files to n8n using `multipart/form-data`.

See [`web-app/README.md`](web-app/README.md) for local setup and frontend implementation details.

### 2. n8n Automation

The n8n workflows handle the backend automation, including:

- Creating and validating orders.
- Searching for existing orders.
- Updating order details and add-ons.
- Uploading and retrieving order images.
- Synchronizing order information with Google Sheets.
- Creating date-specific Telegram groups.
- Sending and updating Telegram order notifications.

The frontend API workflows and their request/response contract are kept in `web-app/n8n-workflows/`. Additional operational workflows are in `automation-workflows/n8n/`.

### 3. Database & File Storage

- **PostgreSQL** stores orders, add-ons, image metadata, and Telegram-related records.
- **Cloudflare R2** stores uploaded cake and deposit images.
- The database schema is available at [`web-app/database/schema.sql`](web-app/database/schema.sql).

### 4. Integrations

- n8n
- PostgreSQL
- Cloudflare R2
- Google Sheets API
- Telegram Bot API
- Evolution API for WhatsApp notifications

## Run the Frontend Locally

1. Open the `web-app` directory.
2. Start a local server, for example:

   ```bash
   python -m http.server 5500
   ```

3. Open `http://127.0.0.1:5500` in your browser.
4. Configure the n8n webhook URLs in `web-app/js/config.js` for your environment.

Do not open the HTML files directly with `file://`; the application uses JavaScript ES modules.

## Configure the Backend

1. Create the PostgreSQL database and run `web-app/database/schema.sql`.
2. Import the required n8n workflows.
3. Configure PostgreSQL, Cloudflare R2, Google Sheets, Telegram, and Evolution API credentials inside n8n.
4. Review [`web-app/n8n-workflows/API-CONTRACT.md`](web-app/n8n-workflows/API-CONTRACT.md) for the frontend/backend API contract.
5. Set the correct webhook URLs and allowed frontend origin for your deployment.

## Frontend Checks

From the `web-app` directory:

```bash
npm run check
npm test
```

## Security

- Configure API tokens and service credentials in n8n credentials or environment variables.
- Do not commit access keys, bot tokens, passwords, or private service credentials.
- The Telegram bot token in the operational send workflow is intentionally represented by the placeholder `YOUR_TELEGRAM_BOT_TOKEN`.
- Review environment-specific webhook URLs and service endpoints before publishing the repository.

## Notes

- The `legacy-google-sheets` workflows are retained as legacy reference files.
- The project contains separate frontend API workflows and operational automation workflows; import the workflow version intended for your deployment.
