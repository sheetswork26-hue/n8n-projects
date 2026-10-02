# 🤖 WhatsApp AI Meeting Assistant

An AI-powered WhatsApp assistant built with **n8n** that can understand text, voice messages, and images, manage meetings, check scheduling conflicts, create Google Calendar events, and send email notifications.

## 🚀 Features

- 💬 Receive messages through WhatsApp
- 📝 Understand text messages
- 🎙️ Transcribe voice messages using AI
- 🖼️ Analyze images using AI
- 🧠 Maintain conversation context with memory
- 📊 Store and manage meetings using Google Sheets
- 🔎 Check existing meetings for scheduling conflicts
- 📅 Create events automatically in Google Calendar
- ✉️ Send email notifications and calendar invitations
- 🌐 Use Google Search when external/current information is required
- 🤖 AI Agent decides which tools are needed for each request

---

## 🏗️ Workflow

```text
                    ┌─────────────────┐
                    │ WhatsApp User   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ WhatsApp Trigger│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │     Switch      │
                    └───┬────┬────┬───┘
                        │    │    │
                     Text  Audio Image
                        │    │    │
                        │    ▼    ▼
                        │  Transcribe
                        │  / Analyze
                        │    │    │
                        └────┴────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    AI Agent     │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
       Google Sheets   Google Calendar   Gmail
       Meeting Data      Create Event    Notifications
              │
              ▼
        Google Search
       (when required)
                             │
                             ▼
                    ┌─────────────────┐
                    │ WhatsApp Reply  │
                    └─────────────────┘
