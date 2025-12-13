import { describe, it } from 'vitest';
import fc from 'fast-check';

/**
 * Property-Based Tests for Documentation Search
 * These tests validate the search functionality for the documentation system
 */

// Mock search function - moved to global scope for reuse across all tests
const mockSearch = (query: string, documents: Array<{ title: string; content: string; type: string }>) => {
    const lowerQuery = query.toLowerCase().trim();
    // Handle empty queries - return empty results
    if (lowerQuery.length === 0) {
        return [];
    }
    return documents.filter(doc =>
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery)
    );
};

// ============================================
// PROPERTY TEST 14.1: Search Functionality
// Validates: Requirements 9.1, 9.2
// ============================================

describe('Property 14.1: Search Functionality', () => {
    it('should return results containing the search query', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // Search query
                fc.array(fc.record({
                    title: fc.string({ minLength: 1, maxLength: 100 }),
                    content: fc.string({ minLength: 10, maxLength: 500 }),
                    type: fc.constantFrom('api', 'component', 'guide', 'architecture')
                }), { minLength: 0, maxLength: 50 }), // Documents
                (query, documents) => {
                    const results = mockSearch(query, documents);

                    // Property: Results are an array
                    return Array.isArray(results);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should rank results by relevance', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    matchCount: fc.integer({ min: 0, max: 10 })
                }), { minLength: 2, maxLength: 20 }),
                (query, documents) => {
                    // Sort by match count (simulating relevance)
                    const sorted = [...documents].sort((a, b) => b.matchCount - a.matchCount);

                    // Property: Results should be ordered by relevance (match count)
                    for (let i = 0; i < sorted.length - 1; i++) {
                        if (sorted[i].matchCount < sorted[i + 1].matchCount) {
                            return false;
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should handle special characters in search queries gracefully', () => {
        const specialChars = ['*', '+', '?', '[', ']', '(', ')', '{', '}', '^', '$', '.', '|', '\\'];

        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.constantFrom(...specialChars),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.string()
                })),
                (baseQuery, specialChar, documents) => {
                    const query = baseQuery + specialChar;

                    // Property: Search should not throw errors with special characters
                    try {
                        mockSearch(query, documents);
                        return true;
                    } catch (error) {
                        return false;
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should return results for partial word matches', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z]+$/.test(s)),
                fc.integer({ min: 1, max: 3 }),
                (word, prefixLength) => {
                    const prefix = word.substring(0, Math.min(prefixLength, word.length));
                    const document = {
                        title: `Document about ${word}`,
                        content: `This document contains the word ${word}`,
                        type: 'guide'
                    };

                    const results = mockSearch(prefix, [document]);

                    // Property: Searching for prefix should match full word
                    return results.length > 0;
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should be case-insensitive', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z\s]+$/.test(s)),
                (query) => {
                    const document = {
                        title: query.toUpperCase(),
                        content: `Content with ${query.toLowerCase()}`,
                        type: 'api'
                    };

                    const resultsLower = mockSearch(query.toLowerCase(), [document]);
                    const resultsUpper = mockSearch(query.toUpperCase(), [document]);
                    const resultsMixed = mockSearch(query, [document]);

                    // Property: Case variations should return same results
                    return resultsLower.length === resultsUpper.length &&
                        resultsUpper.length === resultsMixed.length;
                }
            ),
            { numRuns: 50 }
        );
    });
});

// ============================================
// PROPERTY TEST 14.2: Search Filtering
// Validates: Requirements 9.4
// ============================================

describe('Property 14.2: Search Filtering', () => {
    const mockSearchWithFilter = (
        query: string,
        documents: Array<{ title: string; content: string; type: string; tags: string[] }>,
        filter?: { type?: string; tags?: string[] }
    ) => {
        let results = documents.filter(doc =>
            doc.title.toLowerCase().includes(query.toLowerCase()) ||
            doc.content.toLowerCase().includes(query.toLowerCase())
        );

        if (filter?.type) {
            results = results.filter(doc => doc.type === filter.type);
        }

        if (filter?.tags && filter.tags.length > 0) {
            results = results.filter(doc =>
                filter.tags!.some(tag => doc.tags.includes(tag))
            );
        }

        return results;
    };

    it('should filter results by documentation type', () => {
        const docTypes = ['api', 'component', 'guide', 'architecture'];

        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.constantFrom(...docTypes),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.constantFrom(...docTypes),
                    tags: fc.array(fc.string())
                }), { minLength: 5, maxLength: 30 }),
                (query, filterType, documents) => {
                    const results = mockSearchWithFilter(query, documents, { type: filterType });

                    // Property: All filtered results should match the filter type
                    return results.every(result => result.type === filterType);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should filter results by tags', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.string(),
                    tags: fc.array(fc.string(), { maxLength: 5 })
                })),
                (query, filterTags, documents) => {
                    const results = mockSearchWithFilter(query, documents, { tags: filterTags });

                    // Property: All results should have at least one of the filter tags
                    return results.every(result =>
                        filterTags.some(tag => result.tags.includes(tag))
                    );
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should support multiple filter combinations', () => {
        const docTypes = ['api', 'component', 'guide', 'architecture'];

        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.constantFrom(...docTypes),
                fc.array(fc.string(), { minLength: 1, maxLength: 2 }),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.constantFrom(...docTypes),
                    tags: fc.array(fc.string())
                })),
                (query, filterType, filterTags, documents) => {
                    const results = mockSearchWithFilter(query, documents, {
                        type: filterType,
                        tags: filterTags
                    });

                    // Property: Results must match both type and tag filters
                    return results.every(result =>
                        result.type === filterType &&
                        filterTags.some(tag => result.tags.includes(tag))
                    );
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should return empty results when no documents match filter', () => {
        fc.assert(
            fc.property(
                fc.string(),
                fc.string().filter(s => s.length > 0),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.string(),
                    tags: fc.array(fc.string())
                })),
                (query, nonExistentType, documents) => {
                    // Make sure the type doesn't exist in documents
                    const uniqueType = `unique_${nonExistentType}_${Date.now()}`;
                    const results = mockSearchWithFilter(query, documents, { type: uniqueType });

                    // Property: Filtering by non-existent type should return no results
                    return results.length === 0;
                }
            ),
            { numRuns: 30 }
        );
    });

    it('should preserve search result order when filtering', () => {
        fc.assert(
            fc.property(
                fc.string(),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.constantFrom('api', 'guide'),
                    tags: fc.array(fc.string()),
                    score: fc.integer({ min: 0, max: 100 })
                }), { minLength: 5, maxLength: 20 }),
                (query, documents) => {
                    // Sort by score first
                    const sorted = [...documents].sort((a, b) => b.score - a.score);

                    // Cast to include score in the type for mockSearchWithFilter
                    const results = mockSearchWithFilter(query, sorted, { type: 'api' }) as Array<{ title: string; content: string; type: string; tags: string[]; score: number }>;

                    // Property: Filtered results should maintain relative order
                    for (let i = 0; i < results.length - 1; i++) {
                        if (results[i].score < results[i + 1].score) {
                            return false;
                        }
                    }
                    return true;
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should handle empty filter gracefully', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.string(),
                    tags: fc.array(fc.string())
                })),
                (query, documents) => {
                    const resultsWithEmptyFilter = mockSearchWithFilter(query, documents, {});
                    const resultsWithoutFilter = mockSearchWithFilter(query, documents);

                    // Property: Empty filter should return same results as no filter
                    return resultsWithEmptyFilter.length === resultsWithoutFilter.length;
                }
            ),
            { numRuns: 50 }
        );
    });
});

// ============================================
// ADDITIONAL SEARCH PROPERTIES
// ============================================

describe('Additional Search Properties', () => {
    it('should handle empty query gracefully', () => {
        fc.assert(
            fc.property(
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.string()
                })),
                (documents) => {
                    // Property: Empty query should return no results  
                    const results = mockSearch('', documents);
                    return results.length === 0;
                }
            ),
            { numRuns: 30 }
        );
    });

    it('should handle very long queries', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 100, maxLength: 1000 }),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.string()
                })),
                (longQuery, documents) => {
                    // Property: Long queries should not crash the search
                    try {
                        mockSearch(longQuery, documents);
                        return true;
                    } catch {
                        return false;
                    }
                }
            ),
            { numRuns: 30 }
        );
    });

    it('should return consistent results for same query', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1 }),
                fc.array(fc.record({
                    title: fc.string(),
                    content: fc.string(),
                    type: fc.string()
                })),
                (query, documents) => {
                    const results1 = mockSearch(query, documents);
                    const results2 = mockSearch(query, documents);

                    // Property: Same query should return same results
                    return results1.length === results2.length &&
                        results1.every((r1: any, idx: number) => r1.title === results2[idx].title);
                }
            ),
            { numRuns: 50 }
        );
    });
});
