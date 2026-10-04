# Lead Management Automation

An end-to-end **AI-powered Lead Management Automation** built with **n8n**.

This project automates the process of receiving, validating, scoring, classifying, storing, and notifying the sales team about new leads.

The workflow also handles duplicate submissions and uses AI to analyze qualified leads and generate actionable insights for the sales team.

---

## Problem

Businesses often receive leads through forms, landing pages, or websites.

Without automation, the sales team has to manually:

- Check whether the lead data is valid
- Detect duplicate leads
- Evaluate lead quality
- Decide which leads deserve immediate attention
- Store the lead information
- Analyze the lead's intent
- Notify the sales team
- Respond to the customer

This workflow automates the entire process.

---

## Solution

The system receives a lead through a webhook and processes it through several automated stages:

```text
Lead Form
    ↓
Webhook
    ↓
Input Validation
    ↓
Duplicate Detection
    ↓
Lead Scoring
    ↓
Lead Classification
    ↓
Google Sheets
    ↓
AI Lead Analysis
    ↓
Sales Notification
    ↓
Customer Confirmation
```

---

## Main Features

### 1. Lead Collection

The system receives lead information through a custom web form.

Collected data includes:

- Name
- Email
- Phone
- Company
- Business Type
- Number of Branches
- Budget
- Message

---

### 2. Backend Validation

The workflow validates the submitted data before processing it.

Validation includes:

- Email format
- Egyptian phone number format
- Name format
- Required fields

Phone numbers are normalized to support common Egyptian formats such as:

```text
010xxxxxxxx
011xxxxxxxx
012xxxxxxxx
015xxxxxxxx
+2010xxxxxxxx
20xxxxxxxx
```

The system performs validation on the backend even if frontend validation already exists.

This provides an additional layer of protection against invalid or manipulated requests.

---

### 3. Duplicate Detection

Before creating a new lead, the workflow checks existing leads.

Duplicates are detected using:

- Email
- Phone number

If the lead already exists, the workflow stops the normal processing flow and returns a dedicated duplicate response.

The frontend then redirects the user to a duplicate page explaining whether the duplicate was detected by:

```text
Email
Phone
Both
```

---

### 4. Lead Scoring

Every valid lead receives a score from **0–100**.

The current scoring model considers:

| Factor | Maximum Score |
|---|---:|
| Email | 10 |
| Phone | 10 |
| Company | 10 |
| Business Type | 15 |
| Number of Branches | 20 |
| Budget | 50 |
| Message / Intent | 15 |

The scoring system is rule-based and can be modified easily inside the workflow.

---

### 5. Lead Classification

Based on the final score, leads are classified into:

```text
80+  → Hot
60+  → Warm
<60  → Cold
```

Example:

```text
Score: 87
Classification: Hot
```

This allows the sales team to prioritize high-value opportunities.

---

## AI Lead Analysis

AI is used only after the lead has been validated, scored, classified, and stored.

The AI analyzes qualified leads, specifically:

```text
Hot
Warm
```

Cold leads are ignored by the AI analysis step.

The AI evaluates information such as:

- Business type
- Budget
- Number of branches
- Company
- Lead message
- Lead score

It generates useful sales insights including:

- Intent
- Need
- Potential
- Recommended Action

The AI is instructed to use only the information provided by the lead and avoid inventing information.

---

## Sales Notification

Qualified leads trigger a sales notification through **Pushover**.

The notification provides the sales team with a concise summary of the lead and why it deserves attention.

Example structure:

```text
New Qualified Lead

Lead: LEAD-XXXXXX
Type: Hot
Score: 87

Intent:
...

Need:
...

Potential:
...

Recommended Action:
...
```

This allows the sales team to understand the lead without manually reviewing the entire submission.

---

## Customer Experience

After successful submission, the customer receives a confirmation response.

The workflow also provides a dedicated response for duplicate submissions instead of treating them as new leads.

This prevents duplicate records and gives the user clear feedback.

---

## Data Storage

Lead information is stored in **Google Sheets**.

Stored fields include:

- Lead ID
- Name
- Email
- Phone
- Company
- Business Type
- Number of Branches
- Budget
- Message
- Score
- Lead Type
- Created At

Google Sheets was selected for this project because it provides a simple and accessible storage layer for a small business workflow.

For a larger production system, this layer could be replaced with a relational database such as PostgreSQL.

---

## Workflow Architecture

```text
                    ┌─────────────────┐
                    │   Lead Form     │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Webhook      │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    Duplicate    │
                    │     Check       │
                    └──────┬─────┬────┘
                           │     │
                    Duplicate    │ New Lead
                           │     │
                           ▼     ▼
                    Duplicate   Validation
                     Response      │
                                   ▼
                             Lead Scoring
                                   │
                                   ▼
                              Classification
                                   │
                                   ▼
                             Google Sheets
                                   │
                                   ▼
                              AI Analysis
                                   │
                                   ▼
                              Pushover
                              Notification
```

---

## Technologies

- **n8n** — Workflow automation
- **JavaScript** — Custom validation, normalization, and scoring logic
- **OpenAI** — AI-powered lead analysis
- **Google Sheets** — Lead storage
- **Pushover** — Sales notifications
- **Webhook / REST API** — Lead submission
- **HTML / CSS / JavaScript** — Custom frontend form

---

## Key Automation Logic

### Lead Validation

```text
Receive Lead
     ↓
Validate Email
     ↓
Validate Phone
     ↓
Validate Name
     ↓
Valid?
 ┌───┴───┐
No      Yes
 ↓        ↓
Error   Continue
```

### Duplicate Detection

```text
Search Existing Leads
        ↓
Email Exists?
   OR
Phone Exists?
        ↓
 ┌──────┴──────┐
Yes            No
 ↓              ↓
Duplicate      Continue
Response
```

### Lead Qualification

```text
Calculate Score
      ↓
 ┌────┼────┐
Hot  Warm  Cold
 ↓     ↓     ↓
AI    AI   Ignore
 ↓     ↓
Sales Notification
```

---

## Why AI Is Used

The AI component is not responsible for basic validation or deterministic scoring.

Those operations are handled using normal workflow logic because they are predictable and should produce consistent results.

AI is used where interpretation is more useful:

```text
Lead Message
     +
Business Context
     +
Budget
     +
Branches
     +
Score
     ↓
AI Analysis
     ↓
Sales Insight
```

This keeps deterministic business rules separate from AI-based interpretation.

---

## Error & Edge Case Handling

The workflow currently handles several common edge cases:

- Invalid email
- Invalid Egyptian phone number
- Invalid name
- Duplicate email
- Duplicate phone
- Duplicate email + phone
- Cold leads
- Invalid form submissions
- Missing lead information

Frontend validation is combined with backend validation to avoid relying exclusively on client-side checks.

---

## Project Structure

```text
lead-management-automation/
│
├── Project2 - Lead Management Automation (3).json
│
├── README.md
│
└── screenshots/
    ├── lead-form.png
    ├── workflow.png
    ├── duplicate-page.png
    └── sales-notification.png
```

> Screenshots are optional but recommended for the GitHub repository.

---

## How to Use

### 1. Import the workflow

Import the provided JSON workflow into your n8n instance.

### 2. Configure credentials

Connect the required credentials:

- Google Sheets
- OpenAI
- Pushover

### 3. Configure the Google Sheet

Create a sheet containing the required lead fields.

### 4. Configure the webhook

Connect the frontend form to the lead submission webhook.

### 5. Activate the workflow

Activate the workflow and submit a test lead.

---

## Example Lead

```json
{
  "name": "Ahmed Mohamed",
  "email": "ahmed@example.com",
  "phone": "01012345678",
  "company": "Example Store",
  "businessType": "ecommerce",
  "branches": 5,
  "budget": "5000-10000",
  "message": "We need a camera system for our stores and want to discuss installation."
}
```

Possible result:

```text
Score: 85
Classification: Hot
AI Analysis: Generated
Sales Notification: Sent
Lead Stored: Yes
```

---

## Business Value

The automation helps businesses:

- Reduce manual lead processing
- Prevent duplicate leads
- Prioritize high-value opportunities
- Reduce response time
- Give sales teams actionable lead insights
- Automatically organize lead data
- Improve the overall customer experience

Instead of manually processing every lead, the sales team can focus on leads that actually require human attention.

---

## Limitations & Future Improvements

This project is designed as a practical automation prototype and can be extended further.

Possible improvements include:

- PostgreSQL instead of Google Sheets
- Database-level unique constraints
- More robust phone normalization
- Structured AI output
- Retry mechanisms for external services
- Dedicated error workflow
- Automated lead follow-up
- Follow-up scheduling
- Lead status tracking
- Sales activity tracking
- Authentication and rate limiting
- Monitoring and logging
- Queue-based processing for high traffic

---

## What I Learned

Through this project I practiced building an end-to-end business automation rather than a simple sequence of connected nodes.

Key areas:

- Webhook-based workflows
- Backend validation
- Data normalization
- Duplicate detection
- Rule-based lead scoring
- Business logic implementation
- AI integration
- External API integration
- Google Sheets data handling
- Customer-facing webhooks
- Error and edge-case thinking
- Designing automation around real business requirements

---

## Author

**Ziad Sakr**

AI Automation Engineer / Developer

Interested in:

- AI Automation
- n8n
- Backend Development
- AI Agents
- RAG
- Workflow Automation
- APIs & Integrations

---

## Project Status

**Completed — Portfolio Project**

Current implementation focuses on the complete lead-processing lifecycle from submission to sales notification, with several production-oriented improvements identified for future iterations.
