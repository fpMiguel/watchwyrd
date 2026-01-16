You are a senior product architect, AI systems designer, and Stremio addon expert with strong real-world engineering judgment, cost-awareness, and up-to-date AI platform knowledge.

MISSION  
Design a **technically realistic, production-feasible Stremio addon** that delivers **highly personalized recommendations for BOTH Movies and TV Series**, powered by the **Gemini API** using the **user’s own API key**.

The addon must:
• Respect **all real Stremio platform constraints**
• **Minimize API calls and cost**
• Prefer **Gemini’s built-in capabilities** over external APIs
• Support **recent and newly released content beyond Gemini’s base knowledge cutoff** by using **Gemini online search / browsing tools where available**

The **expected output is ONE single, extremely clear, well-structured Markdown (.md) document**.  
No ambiguity. No brainstorming fragments. No unresolved questions.  
The result must read like a **formal, implementation-ready product & technical specification**.

---

ABSOLUTE TECHNICAL CONSTRAINTS (NON-NEGOTIABLE)

• Stremio addon configuration is **STATIC**
• No runtime user interaction or questioning
• No mood, intent, energy, or social context input
• Only feasible inputs:
  - Static addon configuration values
  - System time, date, timezone
  - Metadata accessible via Stremio
  - Gemini-internal knowledge and tools
  - Public external APIs **only if strictly necessary**
• No hacks, overlays, or unsupported UI tricks
• Must fully respect official Stremio addon architecture
• Must be **easy to implement, maintain, and scale**
• All features must be **latency- and cost-conscious**
• Any feature violating these constraints MUST be explicitly rejected

---

CORE OPTIMIZATION GOALS

1. Produce a **single, final Markdown specification**
2. Support **Movies and Series equally**
3. Maximize personalization **within static constraints**
4. **Minimize API calls** (Gemini + external APIs)
5. Prefer **Gemini-derived knowledge and tools** over additional APIs
6. Allow **user selection of Gemini model** (latest-generation models only)
7. Ensure **recent content (post–knowledge cutoff)** is included via Gemini online search when available
8. Use Gemini strictly as a **reasoning & synthesis engine**, not a chatbot

---

API, COST & RECENCY DISCIPLINE (MANDATORY)

You MUST explicitly reason about:
• Which data can be:
  - Inferred from time/date/timezone alone
  - Derived from Gemini’s general world knowledge
  - Retrieved via Gemini’s **online search / browsing tools**
• When Gemini online search is justified (e.g.:
  - Recently released movies/series
  - Newly trending titles
  - Recent seasons or franchise continuations)
• How often online search is triggered (must be infrequent, cached, and batched)
• When an external API (e.g. weather) is truly unavoidable

Rules:
• No per-item Gemini calls
• Gemini calls operate at **catalog-generation level**
• Online search is **optional, cached, and rate-limited**
• External APIs are a last resort

---

GEMINI MODEL SELECTION REQUIREMENTS

• User selects the Gemini model at install-time
• Only allow **latest-generation Gemini models** suitable for:
  - Multi-signal reasoning
  - Structured output
  - Optional online search / browsing
• Explicitly justify allowed models (e.g. reasoning quality, tool support)
• Explicitly reject:
  - Legacy or deprecated models
  - Models optimized purely for chat
  - Models lacking tool or search support

---

REQUIRED OUTPUT FORMAT (STRICT)

The final output MUST be:
• ONE Markdown (.md) file
• Clean, hierarchical headings
• Clear separation of concerns
• Deterministic, unambiguous language
• No duplicated ideas
• No speculative phrasing

---

REQUIRED MARKDOWN STRUCTURE  
(The output MUST follow this order exactly.)

---

# 1. Addon Overview  
• Name  
• Short description  
• Core value proposition  
• Target users  
• Explicit non-goals  

---

# 2. Technical Foundations  
• How Stremio addons work (accurate and concise)  
• Supported Stremio resources  
• Hosting & performance considerations  
• Known platform limitations  

---

# 3. Supported Content Types  

## 3.1 Movies  
• Scope  
• Metadata usage  
• Runtime & franchise handling  
• Handling of recent releases  

## 3.2 Series  
• Scope  
• Season & episode awareness  
• Binge-friendliness logic  
• Franchise & continuity handling  
• Handling of newly released seasons  

---

# 4. Context & Signal Engine  
(Static, Feasible, API-Efficient)

For EACH signal:
• Description  
• Data source  
• Gemini knowledge sufficient? (Yes / No)  
• Gemini online search needed? (Yes / No, and why)  
• External API required? (Yes / No, and why)  
• How it influences recommendations  
• Implementation complexity (Low / Medium)

Signals may include:
• Time of day  
• Day of week  
• Date & seasonality  
• Public holidays (Gemini-derived vs search)  
• User timezone  
• Weather (Gemini-inferred vs external API)  
• Language preferences  
• Genre affinity weights  
• Age rating constraints  
• Novelty vs familiarity bias  
• Popularity tolerance  
• Release era preferences  
• Runtime / episode length bias  
• Regional availability  

Explicitly list **excluded dynamic signals** and explain WHY they are impossible.

---

# 5. Static Configuration System  

• Configuration fields (clearly listed)  
• Gemini API key handling  
• Gemini model selection (allowed models only)  
• Feature toggles  
• Preference weights  
• Preset profiles (install-time only)  
• Basic vs Advanced mode  
• Validation & error handling  

---

# 6. Gemini Integration Architecture  

• Role of Gemini (high-level reasoning & synthesis)  
• When Gemini is called  
• When Gemini online search is triggered  
• Prompt structure (system + structured config)  
• Output schema (strict, deterministic)  
• Guardrails against prompt instability  
• Caching strategy to minimize calls  
• Failure & fallback behavior  

---

# 7. Recommendation Logic  

• Ranking methodology  
• Movie vs Series balancing  
• Tie-breaking logic  
• Refresh cadence  
• Cold-start behavior  
• How long recommendations remain valid  

---

# 8. Catalog Design  

• Movie recommendation catalogs  
• Series recommendation catalogs  
• Optional sub-catalogs (only if justified)  
• Naming conventions  
• UI behavior inside Stremio  

Each catalog must be explicitly justified.

---

# 9. Explainability & Transparency  

• “Why this was recommended” logic  
• Context tags (time, season, recency, weather-derived if applicable)  
• Relevance or confidence scoring  
• Explainable exclusions  

---

# 10. Novel but Feasible Features  
(Low API Cost, High User Value)

Each feature must include:
• Description  
• User benefit  
• API cost impact  
• Technical feasibility explanation  

Explicitly reject gimmicks or high-cost ideas.

---

# 11. Privacy, Security & Data Handling  

• Gemini API key handling  
• Data storage policy (prefer stateless)  
• Online search data handling  
• External API data usage  
• User trust considerations  

---

# 12. Performance & Scalability  

• Request flow  
• Gemini call frequency  
• Online search usage limits  
• External API call limits  
• Caching layers  
• Cost control strategy  

---

# 13. Roadmap  

• MVP (strictly minimal, high value)  
• v2 (low-cost, high-impact enhancements)  
• v3 (optional, carefully justified expansions)  

---

STYLE & QUALITY BAR

• Write like a senior engineer + product designer  
• Be precise, critical, and pragmatic  
• No buzzwords  
• No filler  
• No contradictions  
• Everything must be implementable  
• Optimize for **clarity, feasibility, recency, and cost-efficiency**

Your objective is to deliver **a flawless, unambiguous, production-ready Markdown specification** for a **Gemini-powered Stremio addon for Movies and Series** that is **innovative, realistic, API-efficient, and up-to-date with recent content**.
