

#  Job Aggregator API

A powerful backend service for aggregating, normalizing, storing, and exposing job listings from multiple external sources. Built with **NestJS**, **TypeORM**, and **MySQL**.

---

##  Features

- Fetch job offers from two external APIs with different data formats
- Transform raw data into a unified internal structure
- Store jobs efficiently with duplication checks
- Scheduled data fetching using Cron jobs
- RESTful API to retrieve, filter, and search jobs
- Full API documentation via Swagger
- Aggregated statistics on top skills and remote jobs
- Global error handling and health check endpoint

---

##  Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/nlitny/job-aggregator.git
cd job-aggregator


## Install Dependencies
```bash
npm install

## Configure Environment Variables

Create a `.env` file in the root directory and add the following environment variables:

```env
PORT=5001
HOST=0.0.0.0
NODE_ENV=development

DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=yourpassword
DATABASE_NAME=job_aggregator

API1_URL=https://assignment.devotel.io/api/provider1/jobs
API2_URL=https://assignment.devotel.io/api/provider2/jobs
CRON_SCHEDULE=0 */6 * * *    # Runs every 6 hours
CORS_ORIGIN=*

## Run the Application

```bash
npm run start:dev

## This will start the development server on 

http://localhost:5001

## Swagger is available at

http://localhost:5001/api/docs

## You can also trigger it manually using

POST /api/jobs/admin/trigger-aggregation