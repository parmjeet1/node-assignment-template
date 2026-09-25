CREATE TABLE auctions (
  id                  BIGINT        NOT NULL AUTO_INCREMENT,
  title               VARCHAR(255)  NOT NULL,
  starting_price      DECIMAL(12,2) NOT NULL,
  current_top_amount  DECIMAL(12,2) NULL,
  current_top_bid_id  BIGINT        NULL,
  current_top_user_id BIGINT        NULL,
  ends_at             DATETIME(3)   NOT NULL,          -- stored in UTC
  created_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE bids (
  id              BIGINT        NOT NULL AUTO_INCREMENT,
  auction_id      BIGINT        NOT NULL,
  user_id         BIGINT        NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  idempotency_key VARCHAR(64)   NOT NULL,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bids_user_idem (user_id, idempotency_key),
  KEY idx_bids_auction_created (auction_id, created_at),
  CONSTRAINT fk_bids_auction FOREIGN KEY (auction_id) REFERENCES auctions(id)
) ENGINE=InnoDB;

-- Sample data ids 1, 2 open, id 3 already closed
INSERT INTO auctions (title, starting_price, ends_at) VALUES
  ('Vintage Watch (open)',  1000.00, UTC_TIMESTAMP(3) + INTERVAL 1 DAY),
  ('Old Painting (open)',    500.00, UTC_TIMESTAMP(3) + INTERVAL 2 HOUR),
  ('Antique Coin (closed)',  200.00, UTC_TIMESTAMP(3) - INTERVAL 1 HOUR);
