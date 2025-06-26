# 🧠 PairwiseRanker.js

A lightweight, session-based JavaScript library for deterministic pairwise ranking. Inspired by classic “Hot or Not”-style comparisons, the library intelligently selects which pairs to compare next, computes rankings in real-time, and determines when the session is complete.

No duplicate comparisons. No unnecessary computation. Just smart, convergent ranking.

---

## ✨ Features

* Simple JavaScript API
* Dynamic ranking based on pairwise comparisons
* Smart pair scheduling to accelerate ranking convergence
* Session automatically ends when confidence is high or all pairs are compared
* Deterministic scoring (no random outcomes or voting conflicts)
* Pure JS — no dependencies

---

## 📦 Installation

```bash
npm install pairwise-ranker
```

OR drop into your app via ES6 module:

```js
import { PairwiseRanker } from './pairwise-ranker.js';
```

---

## 🚀 Basic Usage

```js
const items = ['apple', 'banana', 'cherry', 'date'];
const ranker = new PairwiseRanker(items);

// Submit user comparisons
ranker.submitComparison('apple', 'banana'); // user chose apple
ranker.submitComparison('banana', 'cherry'); // user chose banana

// Get current rankings
const rankings = ranker.getRankings();
/*
[
  { item: 'apple', score: 0.9, rank: 1, confidence: 0.95 },
  { item: 'banana', score: 0.7, rank: 2, confidence: 0.85 },
  { item: 'cherry', score: 0.4, rank: 3, confidence: 0.6 },
  { item: 'date', score: 0.1, rank: 4, confidence: 0.2 }
]
*/

// Ask for the next best match
const nextMatch = ranker.getNextMatch(); 
// { itemA: 'cherry', itemB: 'date' }

// Get the top 10 most useful remaining comparisons
const matches = ranker.getNextMatches(10);

// Check if session is done
if (ranker.isSessionComplete()) {
  const finalRankings = ranker.getRankings();
  displayResults(finalRankings);
}
```

---

## 🧩 API Reference

### `new PairwiseRanker(items: string[])`

Initializes a ranking session with a list of items.

---

### `submitComparison(winner: string, loser: string)`

Submits a binary comparison result. Assumes deterministic outcome: winner always beats loser.

---

### `getRankings(): Array<{ item, score, rank, confidence }>`

Returns the current item rankings, sorted by score descending. Each item includes:

* `score`: numeric value between 0–1
* `rank`: position in ranking
* `confidence`: estimate of ranking confidence (0–1)

---

### `getNextMatch(): { itemA, itemB } | null`

Returns the single most useful next pair to compare. Returns `null` if the session is complete.

---

### `getNextMatches(n: number): Array<{ itemA, itemB }>`

Returns the top `n` most useful comparisons to ask users.

---

### `isSessionComplete(): boolean`

Returns true if:

* All unique pairs have been compared, OR
* All items have achieved confidence > configurable threshold (default: 0.9)

---

### `reset()`

Resets the entire ranking session.

---

## 🧠 Under the Hood

### Prioritization Algorithm

Uncompared pairs are scored using:

```js
pairScore = (
  lowComparisonWeight * (1 / (pair.comparisonCount + 1)) +
  confidenceWeight * (1 - avgItemConfidence) +
  proximityWeight * (1 / (1 + scoreDifference))
)
```

This prioritizes:

* Pairs with few/no comparisons
* Items with low confidence
* Close-score pairs (high impact)

Default weights:

* `lowComparisonWeight = 0.5`
* `confidenceWeight = 0.3`
* `proximityWeight = 0.2`

---

## 🧪 Performance Targets

* Supports up to 1000 items in a session
* No pair repeated per session
* Rankings stabilize with <50% of all possible comparisons
* `getNextMatches(10)` under 10ms (on 500 items)

---

## 🔮 Roadmap Ideas

Not in scope for v1, but easy to extend later:

* Support for ties (neutral outcomes)
* Weighted votes or confidence-based user input
* Real-time multiplayer sessions
* Visualization tools / confidence graphs

---

## 💬 Questions?

Reach out to the maintainers

