"""
Token Economics — single source of truth for converting subscription prices
into input/output token allocations.

Pricing model:
  total_compute_budget = subscription_price_usd × COMPUTE_PCT_OF_PRICE
  input_budget         = total_compute_budget × INPUT_PCT_OF_COMPUTE
  output_budget        = total_compute_budget × (1 - INPUT_PCT_OF_COMPUTE)
  input_tokens         = input_budget  / OPENAI_INPUT_PRICE_PER_TOKEN
  output_tokens        = output_budget / OPENAI_OUTPUT_PRICE_PER_TOKEN

Update the constants below to change pricing model platform-wide.
"""

from typing import Tuple

# ─── Tunable knobs ────────────────────────────────────────────────────
INR_PER_USD = 83.0

# Fraction of subscription revenue allocated to LLM compute cost.
# The remainder covers margin, infrastructure, support, etc.
COMPUTE_PCT_OF_PRICE = 0.50

# Of the compute budget, fraction allocated to INPUT tokens.
# Input is cheaper per token but RAG architectures consume far more
# input than output, so the ratio is heavily input-skewed in dollar terms.
INPUT_PCT_OF_COMPUTE = 0.85

# OpenAI gpt-4o-mini pricing (per 1M tokens, USD)
OPENAI_INPUT_PRICE_PER_M = 0.15
OPENAI_OUTPUT_PRICE_PER_M = 0.60

# Free tier — gets a fixed allocation regardless of price (price = ₹0)
FREE_TIER_TOTAL_TOKENS = 50_000
# ──────────────────────────────────────────────────────────────────────


def compute_token_allocation(price_inr_paise: int, billing_period: str = "monthly") -> Tuple[int, int]:
    """
    Convert a subscription price (in paise) into (input_tokens, output_tokens).

    Args:
        price_inr_paise: Price as stored in the `packages.price_monthly`
            column (in paise — 9900 means ₹99). For yearly subscriptions,
            pass `price_yearly` and set billing_period='yearly'.
        billing_period: 'monthly' or 'yearly'. Just affects how the
            allocation is interpreted; tokens are sized to the full
            subscription period regardless.

    Returns:
        (input_tokens, output_tokens) tuple of integers.

    Special case: price = 0 returns the FREE_TIER allocation split 85:15.
    """
    # Free tier
    if price_inr_paise <= 0:
        free_input = int(FREE_TIER_TOTAL_TOKENS * INPUT_PCT_OF_COMPUTE)
        free_output = FREE_TIER_TOTAL_TOKENS - free_input
        return free_input, free_output

    # Convert paise → rupees → USD
    price_inr = price_inr_paise / 100.0
    price_usd = price_inr / INR_PER_USD

    # Apply pricing model
    compute_budget_usd = price_usd * COMPUTE_PCT_OF_PRICE
    input_budget_usd = compute_budget_usd * INPUT_PCT_OF_COMPUTE
    output_budget_usd = compute_budget_usd * (1.0 - INPUT_PCT_OF_COMPUTE)

    # Convert dollar budgets to token counts
    input_tokens = int(input_budget_usd / (OPENAI_INPUT_PRICE_PER_M / 1_000_000))
    output_tokens = int(output_budget_usd / (OPENAI_OUTPUT_PRICE_PER_M / 1_000_000))

    return input_tokens, output_tokens


def compute_token_allocation_from_rupees(price_inr_rupees: float) -> Tuple[int, int]:
    """
    Convenience wrapper for callers that have the price as whole rupees
    (not paise). E.g., institutional packages with price_yearly stored
    as whole rupees: compute_token_allocation_from_rupees(300000).
    """
    if price_inr_rupees <= 0:
        return compute_token_allocation(0)
    # Convert rupees → paise → call main function
    return compute_token_allocation(int(price_inr_rupees * 100))
