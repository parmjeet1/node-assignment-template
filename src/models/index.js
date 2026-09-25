
export const findAuctionForUpdate = async (conn, auctionId) => {
  const [rows] = await conn.query(
    "SELECT *, UTC_TIMESTAMP(3) < ends_at AS is_open FROM auctions WHERE id = ? FOR UPDATE",
    [auctionId]
  );
  return rows[0] || null;
};

export const findBidByIdempotencyKey = async (conn, userId, idempotencyKey) => {
  const [rows] = await conn.query(
    "SELECT * FROM bids WHERE user_id = ? AND idempotency_key = ?",
    [userId, idempotencyKey]
  );
  return rows[0] || null;
};

export const findBidById = async (conn, bidId) => {
  const [rows] = await conn.query("SELECT * FROM bids WHERE id = ?", [bidId]);
  return rows[0] || null;
};

export const insertBid = async (conn, { auctionId, userId, amount, idempotencyKey }) => {
  const [result] = await conn.query(
    "INSERT INTO bids (auction_id, user_id, amount, idempotency_key) VALUES (?, ?, ?, ?)",
    [auctionId, userId, amount, idempotencyKey]
  );
  return result.insertId;
};

export const updateTopBid = async (conn, { auctionId, bidId, userId, amount }) => {
  await conn.query(
    "UPDATE auctions SET current_top_amount = ?, current_top_bid_id = ?, current_top_user_id = ? WHERE id = ?",
    [amount, bidId, userId, auctionId]
  );
};
