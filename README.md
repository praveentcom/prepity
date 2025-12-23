# Prepity

<img width="1222" alt="prepity_og" src="https://github.com/user-attachments/assets/77acfbfe-cf84-4b9c-aa29-ede22d4dff83" />

## How to run?

Prepity is a web application that allows you to generate practice MCQs for any topic. It uses the OpenAI API (`GPT-5.2` model) to generate questions and the PostgreSQL database to store the questions.

To run the application, you need to have the following prerequisites:

1. PostgreSQL database
2. OpenAI API key

Set up the `.env` file with the variables mentioned in the `.env.example` file. Once you're ready, you can follow the steps below to run the application.

```bash
pnpm install
pnpm prisma:push
pnpm dev
```

Running `pnpm prisma:push` will create the necessary tables in your database. It's not required to run this command again after the first deployment unless you want to make any changes to the schema.

## How to deploy?

To deploy the application to a server, follow the pre-requisites as mentioned in the previous section. Once you're ready, you can follow the steps below to deploy the application.

```bash
pnpm install
pnpm build
pnpm start
```

## Final notes

I've created this application as an OSS template. Get started today and for assistance, you can reach on X. You can also shoot PRs on the way if you'd like something added to Prepity or if there is a bug that's bothering you.
