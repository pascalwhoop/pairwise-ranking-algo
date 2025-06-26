import { PairwiseRanker } from '../pairwise-ranker';

describe('PairwiseRanker', () => {
    const items = ['apple', 'banana', 'cherry', 'date', 'elderberry'];

    it('should initialize with given items', () => {
        const ranker = new PairwiseRanker(items);
        expect(ranker).toBeDefined();
        expect(ranker.getRankings().length).toBe(items.length);
    });

    it('should throw an error if less than two items are provided', () => {
        expect(() => new PairwiseRanker(['apple'])).toThrow('PairwiseRanker requires at least two items.');
        expect(() => new PairwiseRanker([])).toThrow('PairwiseRanker requires at least two items.');
    });

    it('should handle duplicate items gracefully', () => {
        const duplicateItems = ['apple', 'banana', 'apple'];
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const ranker = new PairwiseRanker(duplicateItems);
        expect(consoleWarnSpy).toHaveBeenCalledWith('Duplicate items were provided. Duplicates have been removed.');
        expect(ranker.getRankings().length).toBe(2);
        consoleWarnSpy.mockRestore();
    });

    it('should correctly submit a comparison and update scores', () => {
        const ranker = new PairwiseRanker(['A', 'B']);
        const initialScoreA = ranker.getRankings().find(r => r.item === 'A')?.score;
        const initialScoreB = ranker.getRankings().find(r => r.item === 'B')?.score;

        ranker.submitComparison('A', 'B');

        const newScoreA = ranker.getRankings().find(r => r.item === 'A')?.score;
        const newScoreB = ranker.getRankings().find(r => r.item === 'B')?.score;

        expect(newScoreA).toBeGreaterThan(initialScoreA!);
        expect(newScoreB).toBeLessThan(initialScoreB!);
    });

    it('should not allow comparison of unknown items', () => {
        const ranker = new PairwiseRanker(['A', 'B']);
        expect(() => ranker.submitComparison('A', 'C')).toThrow('Unknown item submitted in comparison.');
    });

    it('should not allow comparison of same items', () => {
        const ranker = new PairwiseRanker(['A', 'B']);
        expect(() => ranker.submitComparison('A', 'A')).toThrow('Winner and loser cannot be the same item.');
    });

    it('should return rankings sorted by score', () => {
        const ranker = new PairwiseRanker(['apple', 'banana', 'cherry']);
        ranker.submitComparison('apple', 'banana');
        ranker.submitComparison('apple', 'cherry');
        ranker.submitComparison('banana', 'cherry');

        const rankings = ranker.getRankings();
        expect(rankings[0].item).toBe('apple');
        expect(rankings[1].item).toBe('banana');
        expect(rankings[2].item).toBe('cherry');
    });

    it('should correctly determine session completion', () => {
        const ranker = new PairwiseRanker(['A', 'B']);
        expect(ranker.isSessionComplete()).toBe(false);
        ranker.submitComparison('A', 'B');
        expect(ranker.isSessionComplete()).toBe(true); // Only one pair, so all compared

        const ranker2 = new PairwiseRanker(['A', 'B', 'C'], { confidenceThreshold: 0.1 });
        expect(ranker2.isSessionComplete()).toBe(false);
        ranker2.submitComparison('A', 'B');
        ranker2.submitComparison('A', 'C');
        ranker2.submitComparison('B', 'C');
        expect(ranker2.isSessionComplete()).toBe(true);
    });

    it('should return the next most useful match', () => {
        const ranker = new PairwiseRanker(['A', 'B', 'C']);
        const nextMatch = ranker.getNextMatch();
        expect(nextMatch).toHaveProperty('itemA');
        expect(nextMatch).toHaveProperty('itemB');
        expect(ranker.getNextMatch()).not.toBeNull();

        ranker.submitComparison(nextMatch!.itemA, nextMatch!.itemB);
        const nextMatch2 = ranker.getNextMatch();
        expect(nextMatch2).not.toEqual(nextMatch);
    });

    it('should return null for next match if session is complete', () => {
        const ranker = new PairwiseRanker(['A', 'B']);
        ranker.submitComparison('A', 'B');
        expect(ranker.isSessionComplete()).toBe(true);
        expect(ranker.getNextMatch()).toBeNull();
    });

    it('should return multiple next useful matches', () => {
        const ranker = new PairwiseRanker(items);
        const matches = ranker.getNextMatches(3);
        expect(matches.length).toBe(3);
        expect(matches[0]).toHaveProperty('itemA');
        expect(matches[0]).toHaveProperty('itemB');
    });

    it('should return empty array for next matches if session is complete', () => {
        const ranker = new PairwiseRanker(['A', 'B']);
        ranker.submitComparison('A', 'B');
        expect(ranker.isSessionComplete()).toBe(true);
        expect(ranker.getNextMatches(5)).toEqual([]);
    });

    it('should reset the session', () => {
        const ranker = new PairwiseRanker(items);
        ranker.submitComparison('apple', 'banana');
        const rankingsBeforeReset = ranker.getRankings();
        // Check that scores have changed from initial 0.5 (normalized)
        expect(rankingsBeforeReset.some(r => r.score !== 0.5)).toBe(true);

        ranker.reset();
        const rankingsAfterReset = ranker.getRankings();
        // After reset, all normalized scores should be 0.5 again
        expect(rankingsAfterReset.every(r => r.score === 0.5)).toBe(true);
        expect(ranker.isSessionComplete()).toBe(false); // Session should not be complete after reset
    });

    it('should prioritize uncompared pairs', () => {
        const ranker = new PairwiseRanker(['A', 'B', 'C']);
        ranker.submitComparison('A', 'B');
        const nextMatches = ranker.getNextMatches(2);
        const expectedPairs = [
            { itemA: 'A', itemB: 'C' },
            { itemA: 'B', itemB: 'C' }
        ];
        // Check if the returned matches contain the expected uncompared pairs
        expect(nextMatches).toEqual(expect.arrayContaining(expectedPairs));
    });

    it('should prioritize items with low confidence', () => {
        const ranker = new PairwiseRanker(['A', 'B', 'C', 'D'], { confidenceThreshold: 0.9 });
        // Make A and B highly confident by comparing them many times
        for (let i = 0; i < 10; i++) {
            ranker.submitComparison('A', 'B');
            // To ensure unique comparisons for confidence, we need to compare different pairs
            // This is a simplified way to increase comparisons for A and B without making all pairs compared
            if (i % 2 === 0) {
                ranker.submitComparison('A', 'C');
            } else {
                ranker.submitComparison('B', 'D');
            }
        }
        // Compare C and D only once to keep their confidence low
        ranker.submitComparison('C', 'D');

        const nextMatches = ranker.getNextMatches(1);
        const nextMatch = nextMatches[0];

        // Expect a pair involving C or D, as they have lower confidence
        // This test relies on the internal prioritization logic, which favors lower confidence.
        // The exact pair might vary, but it should involve C or D.
        expect(nextMatch.itemA === 'C' || nextMatch.itemA === 'D' || nextMatch.itemB === 'C' || nextMatch.itemB === 'D').toBe(true);
    });

    it('should prioritize close-score pairs (high impact)', () => {
        const ranker = new PairwiseRanker(['A', 'B', 'C', 'D']);

        // Submit all initial comparisons to get past the 'uncompared' prioritization
        const allItems = ['A', 'B', 'C', 'D'];
        for (let i = 0; i < allItems.length; i++) {
            for (let j = i + 1; j < allItems.length; j++) {
                const item1 = allItems[i];
                const item2 = allItems[j];
                // Ensure all pairs are compared at least once, except the one we want to test for proximity
                if (!((item1 === 'B' && item2 === 'C') || (item1 === 'C' && item2 === 'B'))) {
                    ranker.submitComparison(item1, item2);
                }
            }
        }

        // Manually set scores to create a close pair (B, C) and a distant pair (A, D)
        // This is a hack for testing the 'proximityWeight' specifically.
        // In a real application, scores would evolve naturally.
        // @ts-ignore
        ranker['items']['A'].score = 1300;
        // @ts-ignore
        ranker['items']['B'].score = 1205;
        // @ts-ignore
        ranker['items']['C'].score = 1200;
        // @ts-ignore
        ranker['items']['D'].score = 1100;

        const nextMatches = ranker.getNextMatches(1);
        const nextMatch = nextMatches[0];

        // Expect the next match to be B and C, as they are the closest in score
        const isBC = (nextMatch.itemA === 'B' && nextMatch.itemB === 'C') || (nextMatch.itemA === 'C' && nextMatch.itemB === 'B');
        expect(isBC).toBe(true);
    });

    it('should correctly calculate confidence', () => {
        const ranker = new PairwiseRanker(['A', 'B', 'C']);
        expect(ranker.getRankings().find(r => r.item === 'A')?.confidence).toBe(0);
        ranker.submitComparison('A', 'B');
        // After one comparison, confidence should be 1 - 1/(1+1) = 0.5
        expect(ranker.getRankings().find(r => r.item === 'A')?.confidence).toBeCloseTo(0.5);
        ranker.submitComparison('A', 'C'); // Another comparison involving A
        // After two comparisons involving A, confidence should be 1 - 1/(1+2) = 0.666...
        expect(ranker.getRankings().find(r => r.item === 'A')?.confidence).toBeCloseTo(0.66667, 5);
    });

    it('should not repeat comparisons', () => {
        const ranker = new PairwiseRanker(['A', 'B', 'C']);
        ranker.submitComparison('A', 'B');
        const initialNextMatches = ranker.getNextMatches(10);
        ranker.submitComparison('A', 'B'); // Submit again
        const afterSecondSubmitNextMatches = ranker.getNextMatches(10);
        // The number of uncompared pairs should remain the same if the comparison was already made
        expect(initialNextMatches.length).toEqual(afterSecondSubmitNextMatches.length);
    });

    it('should return correct normalized scores', () => {
        const ranker = new PairwiseRanker(['A', 'B', 'C']);
        ranker.submitComparison('A', 'B');
        ranker.submitComparison('A', 'C');
        ranker.submitComparison('B', 'C');

        const rankings = ranker.getRankings();
        const scores = rankings.map(r => r.score);
        // Normalized scores should be between 0 and 1
        expect(Math.min(...scores)).toBeCloseTo(0);
        expect(Math.max(...scores)).toBeCloseTo(1);
    });

    it('should handle cases where scoreRange is 0 (all scores are equal)', () => {
        const ranker = new PairwiseRanker(['A', 'B', 'C']);
        // Initially all scores are 1200, so scoreRange is 0
        const rankings = ranker.getRankings();
        rankings.forEach(r => {
            expect(r.score).toBe(0.5); // Normalized score should be 0.5 when all are equal
        });
    });
});
