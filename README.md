# Prepity

Prepity is a web application that allows you to generate practice MCQs for any topic. It uses OpenAI (`GPT-5.2`) and PostgreSQL to generate and store the questions.

<img width="2400" height="1260" alt="prepity_cover@2x" src="https://github.com/user-attachments/assets/5807ac9d-0668-4632-9ba4-ce27ad191eea" />

## How to run?

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
