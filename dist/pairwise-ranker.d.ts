/**
 * A lightweight, session-based JavaScript library for deterministic pairwise ranking.
 */
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
export declare class PairwiseRanker {
    private items;
    private _initialItems;
    private allPairs;
    private comparedPairs;
    private _options;
    /**
     * Initializes a ranking session.
     * @param {string[]} items - A list of unique items (strings) to rank.
     * @param {PairwiseRankerOptions} [options] - Configuration options.
     */
    constructor(items: string[], options?: PairwiseRankerOptions);
    /**
     * Resets the entire ranking session to its initial state.
     */
    reset(): void;
    /**
     * Submits the result of a single pairwise comparison.
     * @param {string} winner - The item that won the comparison.
     * @param {string} loser - The item that lost the comparison.
     */
    submitComparison(winner: string, loser: string): void;
    /**
     * Returns the current rankings of all items.
     * @returns {RankingResult[]}
     */
    getRankings(): RankingResult[];
    /**
     * Determines if the ranking session is complete.
     * @returns {boolean} True if the session is complete, false otherwise.
     */
    isSessionComplete(): boolean;
    /**
     * Returns the single most useful pair to compare next.
     * @returns {Pair | null} The next pair or null if complete.
     */
    getNextMatch(): Pair | null;
    /**
     * Returns a list of the most useful pairs to compare next.
     * @param {number} [n=10] - The number of pairs to return.
     * @returns {Pair[]} A list of pairs.
     */
    getNextMatches(n?: number): Pair[];
    /**
     * Generates a canonical key for a pair of items.
     * @private
     */
    private _getPairKey;
}
export {};
