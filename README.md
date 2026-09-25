# Bid Assignment Starter

## Setup

1. cd src
2. npm install
3. nodemon server.js ||node server.js

## What's included

This scaffold includes:
- Server bootstrap with Express
- An empty POST /bid route stub
- ORM/database connection setup - mysql2

The data model/schema and bidding logic are intentionally NOT included — that is the core of the assignment and is left for you to design.


Auction Bid API

Backend for placing bids on an auction. Built with Node.js (Express) and MySQL using mysql2. There is only one endpoint, POST /bid, so most of the work is in handling edge cases correctly.

API

POST /bid

Headers:

Content-Type: application/json
Idempotency-Key: <any unique string for this bid attempt>

body
{ "auction_id": 1, "user_id": 10, "amount": 1500 }