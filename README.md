# n8n Automation Projects

A collection of practical automation projects built with **n8n** and connected services. This repository brings together workflow automations for messaging, lead management, social media engagement, and order management.

Each project is organized in its own folder and includes its related workflow exports and supporting files. The goal of this repository is to document real automation use cases in a clear, reusable, and easy-to-explore format.

---

## Projects

| Project | Description | Main Focus |
|---|---|---|
| [Project 1 — WhatsApp Assistant](./Project1%20-%20Whatsapp%20Assistant/) | A WhatsApp-focused assistant automation project. Explore the project folder for its workflow exports and implementation details. | WhatsApp automation |
| [Project 2 — Lead Management Automation](./Project2%20-%20Lead%20Management%20Automation/) | An automation workflow project for organizing and processing incoming leads, supporting lead tracking and follow-up operations. | Lead management |
| [Project 3 — AI-Powered Facebook Comment & Message Responder](./Project3%20-%20AI-Powered%20Facebook%20Comment%20%26%20Message%20Responder/) | An AI-powered automation project for handling Facebook comments and messages, helping automate social media interactions. | AI + Facebook automation |
| [Project 4 — Cake Order Management Automation](./Project4%20-%20Cake%20Order%20Management%20Automation/) | An order-management solution combining a web application and n8n workflows to create, search, and update orders, manage images, synchronize sheets, and coordinate notifications. | Web app + workflow automation |

## Repository Structure

```text
n8n-projects/
│
├── Project1 - Whatsapp Assistant/
│   └── Workflow files and project resources
│
├── Project2 - Lead Management Automation/
│   └── Workflow files and project resources
│
├── Project3 - AI-Powered Facebook Comment & Message Responder/
│   └── Workflow files and project resources
│
├── Project4 - Cake Order Management Automation/
│   ├── README.md
│   ├── web-app/
│   │   └── README.md
│   └── automation-workflows/
│       └── n8n/
│           └── README.md
│
└── README.md
```

> Folder contents may vary by project. Check each project's own README for its actual structure, requirements, configuration, and setup instructions.

## Technology & Integrations

The projects in this repository use n8n as the primary workflow automation platform. Depending on the project, integrations and technologies include:

- **n8n** — workflow orchestration, triggers, webhooks, and service integrations.
- **JavaScript** — data transformation, validation, and custom workflow logic.
- **AI / LLM APIs** — language understanding and AI-assisted responses in applicable projects.
- **WhatsApp integrations** — messaging and assistant workflows.
- **Facebook Graph API** — Facebook page comments and messaging integrations.
- **PostgreSQL** — structured data storage in applicable projects.
- **Google Sheets API** — data synchronization and operational tracking.
- **Cloudflare R2** — object storage for uploaded files and images.
- **Telegram Bot API** — operational notifications and messaging.
- **Evolution API** — WhatsApp messaging integration.
- **Docker** — local or container-based service deployment where configured.

Not every technology is used by every project. Refer to the individual project documentation for its specific stack.

## How to Explore the Repository

1. Choose a project from the **Projects** section.
2. Open its folder and read the project's `README.md`, if available.
3. Review the workflow JSON exports and supporting files.
4. Check the documented prerequisites and required integrations before importing or running a workflow.

## Importing an n8n Workflow

For projects that include n8n workflow JSON files:

1. Open your n8n instance.
2. Use the workflow menu and choose **Import from File**.
3. Select the workflow JSON file from the relevant project folder.
4. Configure the credentials, API keys, webhook URLs, and environment-specific values required by that workflow.
5. Test the workflow with non-production data before activating it.

Importing a workflow does not automatically create external accounts, credentials, databases, spreadsheets, messaging channels, or third-party services.

## Configuration & Security

Before running any project:

- Configure your own credentials and API access.
- Replace example URLs, IDs, and placeholders with values from your environment.
- Store secrets in n8n Credentials or environment variables whenever possible.
- Never publish API keys, access tokens, passwords, private webhook URLs, or session files.
- Review webhook access controls and permissions before exposing endpoints publicly.
- Check each project's README for additional security and deployment requirements.

## Repository Notes

- Projects are maintained as separate folders so they can be explored independently.
- Workflow exports are provided for learning, review, and reuse; they may require configuration before they can run in another environment.
- Project-specific documentation takes precedence over this repository overview.
- External services and APIs may change; verify their current requirements when configuring an integration.

## Author

Created and maintained by **sheetswork26-hue**.

If you find these projects useful, feel free to explore the workflows and adapt the documented ideas to your own automation use cases.
