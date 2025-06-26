/**
 * A lightweight, session-based JavaScript library for deterministic pairwise ranking.
 */

interface ItemData {
    item: string;
    score: number;
    confidence: number;
    comparisons: number;
}

interface Pair {
    itemA: string;
    itemB: string;
}

interface RankingResult {
    item: string;
    score: number;
    rank: number;
    confidence: number;
}

interface PairwiseRankerOptions {
    confidenceThreshold?: number;
    lowComparisonWeight?: number;
    confidenceWeight?: number;
    proximityWeight?: number;
    kFactor?: number;
}

export class PairwiseRanker {
    private items!: { [key: string]: ItemData };
    private _initialItems: string[];
    private allPairs!: Pair[];
    private comparedPairs!: Set<string>;
    private _options: Required<PairwiseRankerOptions>;

    /**
     * Initializes a ranking session.
     * @param {string[]} items - A list of unique items (strings) to rank.
     * @param {PairwiseRankerOptions} [options] - Configuration options.
     */
    constructor(items: string[], options: PairwiseRankerOptions = {}) {
        if (!items || items.length < 2) {
            throw new Error('PairwiseRanker requires at least two items.');
        }
        const uniqueItems = [...new Set(items)];
        if (uniqueItems.length !== items.length) {
            console.warn('Duplicate items were provided. Duplicates have been removed.');
        }
        this._initialItems = uniqueItems;
        this._options = {
            confidenceThreshold: 0.9,
            lowComparisonWeight: 0.5,
            confidenceWeight: 0.3,
            proximityWeight: 0.2,
            kFactor: 32,
            ...options,
        };
        this.reset();
    }

    /**
     * Resets the entire ranking session to its initial state.
     */
    reset(): void {
        this.items = {};
        this._initialItems.forEach(item => {
            this.items[item] = {
                item: item,
                score: 1200, // Initial Elo rating
                confidence: 0,
                comparisons: 0,
            };
        });

        this.allPairs = [];
        for (let i = 0; i < this._initialItems.length; i++) {
            for (let j = i + 1; j < this._initialItems.length; j++) {
                this.allPairs.push({
                    itemA: this._initialItems[i],
                    itemB: this._initialItems[j],
                });
            }
        }

        this.comparedPairs = new Set<string>();
    }

    /**
     * Submits the result of a single pairwise comparison.
     * @param {string} winner - The item that won the comparison.
     * @param {string} loser - The item that lost the comparison.
     */
    submitComparison(winner: string, loser: string): void {
        if (!this.items[winner] || !this.items[loser]) {
            throw new Error('Unknown item submitted in comparison.');
        }
        if (winner === loser) {
            throw new Error('Winner and loser cannot be the same item.');
        }

        const pairKey = this._getPairKey(winner, loser);
        if (this.comparedPairs.has(pairKey)) {
            return;
        }

        const winnerData = this.items[winner];
        const loserData = this.items[loser];

        const winnerExpected = 1 / (1 + Math.pow(10, (loserData.score - winnerData.score) / 400));
        const loserExpected = 1 - winnerExpected;

        winnerData.score += this._options.kFactor * (1 - winnerExpected);
        loserData.score += this._options.kFactor * (0 - loserExpected);

        this.comparedPairs.add(pairKey);
        winnerData.comparisons++;
        loserData.comparisons++;
        winnerData.confidence = 1 - 1 / (1 + winnerData.comparisons);
        loserData.confidence = 1 - 1 / (1 + loserData.comparisons);
    }

    /**
     * Returns the current rankings of all items.
     * @returns {RankingResult[]}
     */
    getRankings(): RankingResult[] {
        const itemData = Object.values(this.items);

        const scores = itemData.map(i => i.score);
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        const scoreRange = maxScore - minScore;

        const rankedItems: RankingResult[] = itemData.map(item => {
            const normalizedScore = scoreRange > 0 ? (item.score - minScore) / scoreRange : 0.5;
            return {
                item: item.item,
                score: normalizedScore,
                confidence: item.confidence,
                rank: 0,
            };
        });

        rankedItems.sort((a, b) => b.score - a.score);
        rankedItems.forEach((item, index) => {
            item.rank = index + 1;
        });

        return rankedItems;
    }

    /**
     * Determines if the ranking session is complete.
     * @returns {boolean} True if the session is complete, false otherwise.
     */
    isSessionComplete(): boolean {
        if (this.comparedPairs.size === this.allPairs.length) {
            return true;
        }

        const allConfident = Object.values(this.items).every(
            item => item.confidence >= this._options.confidenceThreshold
        );
        return allConfident;
    }

    /**
     * Returns the single most useful pair to compare next.
     * @returns {Pair | null} The next pair or null if complete.
     */
    getNextMatch(): Pair | null {
        const matches = this.getNextMatches(1);
        return matches.length > 0 ? matches[0] : null;
    }

    /**
     * Returns a list of the most useful pairs to compare next.
     * @param {number} [n=10] - The number of pairs to return.
     * @returns {Pair[]} A list of pairs.
     */
    getNextMatches(n: number = 10): Pair[] {
        if (this.isSessionComplete()) {
            return [];
        }

        const uncomparedPairs = this.allPairs.filter(pair => {
            const key = this._getPairKey(pair.itemA, pair.itemB);
            return !this.comparedPairs.has(key);
        });

        if (uncomparedPairs.length === 0) {
            return [];
        }

        const allScores = Object.values(this.items).map(i => i.score);
        const minScore = Math.min(...allScores);
        const maxScore = Math.max(...allScores);
        const scoreRange = maxScore - minScore;

        const scoredPairs = uncomparedPairs.map(pair => {
            const itemA = this.items[pair.itemA];
            const itemB = this.items[pair.itemB];

            const comparisonTerm = this._options.lowComparisonWeight;
            const avgItemConfidence = (itemA.confidence + itemB.confidence) / 2;
            const confidenceTerm = this._options.confidenceWeight * (1 - avgItemConfidence);

            let scoreDifference = 0;
            if (scoreRange > 0) {
                const normalizedScoreA = (itemA.score - minScore) / scoreRange;
                const normalizedScoreB = (itemB.score - minScore) / scoreRange;
                scoreDifference = Math.abs(normalizedScoreA - normalizedScoreB);
            }
            const proximityTerm = this._options.proximityWeight * (1 / (1 + scoreDifference));

            const pairScore = comparisonTerm + confidenceTerm + proximityTerm;
            return { itemA: pair.itemA, itemB: pair.itemB, score: pairScore };
        });

        scoredPairs.sort((a, b) => b.score - a.score);

        return scoredPairs.slice(0, n).map(p => ({ itemA: p.itemA, itemB: p.itemB }));
    }

    /**
     * Generates a canonical key for a pair of items.
     * @private
     */
    private _getPairKey(itemA: string, itemB: string): string {
        return [itemA, itemB].sort().join('||');
    }
}