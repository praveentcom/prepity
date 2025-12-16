# Prepity

<img width="1222" alt="prepity_og" src="https://github.com/user-attachments/assets/77acfbfe-cf84-4b9c-aa29-ede22d4dff83" />

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### Required

```env
# PostgreSQL database connection string
DATABASE_URL="postgresql://user:password@localhost:5432/prepity"

# OpenAI API key for generating questions
OPENAI_API_KEY="sk-..."

# Base URL of the application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### Optional

```env
# Environment name (displayed in sidebar)
NEXT_PUBLIC_ENVIRONMENT="development"

# Umami Analytics (optional)
NEXT_PUBLIC_UMAMI_HOST="https://your-umami-instance.com"
NEXT_PUBLIC_UMAMI_WEBSITE_ID="your-website-id"
```
