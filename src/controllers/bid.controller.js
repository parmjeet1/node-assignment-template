import pool from "../config/database.js";
import * as Model from "../models/index.js";

// Compare money in integer cents - never compare floats
const toCents = (v) => Math.round(Number(v) * 100);

const httpError = (status, code, message, details) =>
  Object.assign(new Error(message), { status, code, details });

const isPositiveInt = (v) => Number.isSafeInteger(v) && v > 0;
const isValidAmount = (v) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 9999999999.99 && Math.round(v * 100) === v * 100;

// Same key must mean same bid; same key + different payload = client bug
const checkReplay = (bid, auctionId, amount) => {
  if (String(bid.auction_id) !== String(auctionId) || toCents(bid.amount) !== toCents(amount)) {
    throw httpError(422, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was already used for a different bid");
  }
  return bid;
};

export const placeBid = async (req, res, next) => {
  const { auction_id: auctionId, user_id: userId, amount } = req.body || {};
  const idempotencyKey = req.get("Idempotency-Key");

  // 1. Validate input
  const errors = [];
  if (!isPositiveInt(auctionId)) errors.push("auction_id must be a positive integer");
  if (!isPositiveInt(userId)) errors.push("user_id must be a positive integer");
  if (!isValidAmount(amount)) errors.push("amount must be a positive number with max 2 decimals");
  if (!idempotencyKey || idempotencyKey.length > 64) errors.push("Idempotency-Key header is required (max 64 chars)");
  if (errors.length) return next(httpError(400, "INVALID_INPUT", "Invalid request", errors));

  const conn = await pool.getConnection();
  try {
    // READ COMMITTED: reads after the row lock see the latest committed data
    await conn.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    await conn.beginTransaction();

    // 2. Lock the auction row -> bids on the same auction are processed one at a time
    const auction = await Model.findAuctionForUpdate(conn, auctionId);
    if (!auction) throw httpError(404, "AUCTION_NOT_FOUND", "Auction not found");

    // 3. Retry of an already-processed request -> return the original bid
    const existing = await Model.findBidByIdempotencyKey(conn, userId, idempotencyKey);
    if (existing) {
      await conn.commit();
      return res.status(200).json({ bid: checkReplay(existing, auctionId, amount), replayed: true });
    }

    // 4. Close-time rule: bid at or after ends_at is rejected
    if (!Number(auction.is_open)) throw httpError(409, "AUCTION_CLOSED", "Auction has ended");

    // 5. Current top bidder can't outbid themselves
    if (auction.current_top_user_id !== null && String(auction.current_top_user_id) === String(userId)) {
      throw httpError(409, "ALREADY_TOP_BIDDER", "You are already the top bidder");
    }

    // 6. Amount: first bid >= starting_price, later bids strictly > current top
    if (auction.current_top_amount === null) {
      if (toCents(amount) < toCents(auction.starting_price)) {
        throw httpError(409, "BID_TOO_LOW", "Bid must be at least the starting price", {
          min_amount: auction.starting_price
        });
      }
    } else if (toCents(amount) <= toCents(auction.current_top_amount)) {
      throw httpError(409, "BID_TOO_LOW", "Bid must be higher than the current top bid", {
        current_top_amount: auction.current_top_amount
      });
    }

    // 7. Save bid + move top-bid pointer in the same transaction
    const bidId = await Model.insertBid(conn, { auctionId, userId, amount, idempotencyKey });
    await Model.updateTopBid(conn, { auctionId, bidId, userId, amount });
    const bid = await Model.findBidById(conn, bidId);

    await conn.commit();
    return res.status(201).json({ bid, replayed: false });
  } catch (err) {
    await conn.rollback();

    // Two identical retries raced -> UNIQUE(user_id, idempotency_key) blocked the 2nd one
    if (err.code === "ER_DUP_ENTRY") {
      try {
        const existing = await Model.findBidByIdempotencyKey(conn, userId, idempotencyKey);
        if (existing) return res.status(200).json({ bid: checkReplay(existing, auctionId, amount), replayed: true });
      } catch (replayErr) {
        return next(replayErr);
      }
    }
    return next(err);
  } finally {
    conn.release();
  }
};
