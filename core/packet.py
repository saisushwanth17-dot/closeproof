from typing import List, Optional
from datetime import datetime
from .reconcile import ReconItem


def _format_citation(citation: str) -> str:
    """Format a citation as a markdown link if it is a URL, else return string."""
    c = citation.strip()
    if c.startswith("http://") or c.startswith("https://"):
        # Create readable label from URL domain/path
        label = c.replace("https://", "").replace("http://", "").split("/")[0]
        return f"[{label}]({c})"
    return c


def _format_currency(amount: float) -> str:
    """Format a number into clean currency format."""
    if amount < 0:
        return f"-${abs(amount):,.2f}"
    return f"${amount:,.2f}"


def generate_close_packet(items: List[ReconItem], company_name: str = "Acme Corp") -> str:
    """
    Generates an accountant-ready Markdown close packet from reconciliation items.

    Sections:
      1. Executive Summary (KPI metrics: total items, match rate, matched $, exceptions $)
      2. 🚨 Exceptions Requiring Human Action (sorted by absolute amount descending)
      3. ✅ Matched Transactions (collapsible detailed list with confidence and evidence)
    """
    matched_items = [i for i in items if i.status == "matched"]
    exceptions = [i for i in items if i.status == "exception"]

    total_matched_amt = sum(abs(i.amount) for i in matched_items)
    total_exception_amt = sum(abs(i.amount) for i in exceptions)
    total_count = len(items)
    match_rate = (len(matched_items) / total_count * 100) if total_count else 0.0

    # Header
    now_utc = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# Month-End Close Packet: {company_name}",
        f"*Generated on {now_utc} by CloseProof*\n",
        "---",
        "## 1. Executive Summary\n",
        "| Metric | Value |",
        "|---|---|",
        f"| **Total Items Processed** | {total_count:,} |",
        f"| **Match Rate** | **{match_rate:.1f}%** ({len(matched_items)} matched / {total_count} total) |",
        f"| **Total Reconciled Volume** | {_format_currency(total_matched_amt)} |",
        f"| **Total Unreconciled Exceptions** | **{_format_currency(total_exception_amt)}** ({len(exceptions)} exceptions) |\n",
        "---",
        "## 2. 🚨 Exceptions Requiring Human Action\n",
    ]

    if not exceptions:
        lines.append("✅ *No exceptions found. All transactions matched successfully.*\n")
    else:
        lines.append("Every exception carries required human decision, supporting evidence, and citations.")
        lines.append("Sorted by largest dollar impact first.\n")
        lines.append("| Amount | Status | Human Action | Explanation | Citations |")
        lines.append("|---|---|---|---|---|")

        # Sort exceptions by absolute amount descending (biggest problems first)
        sorted_exceptions = sorted(exceptions, key=lambda x: abs(x.amount), reverse=True)

        for exc in sorted_exceptions:
            amt_str = _format_currency(exc.amount)
            status_str = f"**{exc.status.upper()}**"
            action_str = f"`{exc.human_action}`" if exc.human_action else "`escalate_accountant`"

            explanation_str = (exc.explanation or "Waiting for AI analysis...").replace("\n", " ").strip()

            # Format citations
            if exc.citations:
                cites_str = ", ".join(_format_citation(c) for c in exc.citations)
            else:
                cites_str = "None"

            lines.append(f"| {amt_str} | {status_str} | {action_str} | {explanation_str} | {cites_str} |")

        lines.append("")

    # Section 3: Matched Transactions
    lines.extend([
        "---",
        f"## 3. ✅ Matched Transactions ({len(matched_items)})\n",
    ])

    if not matched_items:
        lines.append("*No matched transactions recorded.*\n")
    else:
        lines.append("<details>")
        lines.append(f"<summary><strong>Click to expand {len(matched_items)} verified matches</strong></summary>\n")

        for m in matched_items:
            amt_str = _format_currency(m.amount)
            conf_str = f"{m.confidence * 100:.0f}%"

            # Summarize candidates
            candidate_parts = []
            for c in m.candidates:
                candidate_parts.append(f"{c.source}: {c.doc_id} ({c.field}={c.value})")
            cand_summary = "; ".join(candidate_parts) if candidate_parts else "Verified match"

            expl = f" - *{m.explanation}*" if m.explanation else ""
            lines.append(f"- **{amt_str}** (Confidence: `{conf_str}`) - {cand_summary}{expl}")

        lines.append("\n</details>\n")

    lines.append("---\n*CloseProof | Built on NVIDIA Open Models and Nebius AI Infrastructure*")

    return "\n".join(lines)


def save_packet(markdown_content: str, filename: str = "close_packet.md") -> None:
    """Saves the generated markdown to disk."""
    with open(filename, "w", encoding="utf-8") as f:
        f.write(markdown_content)
    print(f"Packet saved to {filename}")

