const URL = "http://localhost:2424/bid";

// 20 different users, same amount, fired at the same time on auction 2
const results = await Promise.all(
  Array.from({ length: 20 }, (_, i) =>
    fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": `race-${Date.now()}-${i}` },
      body: JSON.stringify({ auction_id: 2, user_id: 100 + i, amount: 600 })
    }).then(async (r) => ({ status: r.status, body: await r.json() }))
  )
);

const accepted = results.filter((r) => r.status === 201);
console.log("Accepted:", accepted.length, "(expected 1)");
console.log("Rejected:", results.filter((r) => r.status === 409).length, "(expected 19)");
console.log("Winner user_id:", accepted[0]?.body.bid.user_id);