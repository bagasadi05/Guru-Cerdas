/**
 * Expands concatenated compound numbers into space-separated tokens.
 * Handles three-word concatenations (e.g. "delapanpuluhlima" -> "delapan puluh lima")
 * and two-word concatenations (e.g. "delapanpuluh" -> "delapan puluh", "duabelas" -> "dua belas").
 */
export function expandUnspacedNumbers(text: string): string {
    const prefixes =
        'dua|loro|ro|duo|tiga|telu|tilu|tigo|tige|empat|papat|pat|opat|ampat|lima|limo|lime|enam|nem|genep|anam|onam|tujuh|pitu|tuju|tujoh|delapan|lapan|dapan|wolu|dalapan|sembilan|songo|salapan|sambilan|sembilang|rong|telung|patang|pitung|wolung|sangang|songong';
    const tensUnits = 'puluh|ngpuluh|belas|welas|ratus|atus';
    const singleDigits =
        'satu|dua|loro|ro|duo|due|tiga|telu|tilu|tigo|empat|papat|pat|opat|ampat|lima|limo|lime|enam|nem|genep|anam|tujuh|pitu|tuju|tujoh|delapan|lapan|dapan|wolu|sembilan|songo|siji|hiji';

    // 1. Compound three-word concatenated: e.g. "delapanpuluhlima" -> "delapan puluh lima"
    const threeWordRegex = new RegExp(`\\b(${prefixes})(${tensUnits})(${singleDigits})\\b`, 'gi');
    let res = text.replace(threeWordRegex, '$1 $2 $3');

    // 2. Compound two-word concatenated: e.g. "delapanpuluh" -> "delapan puluh", "duabelas" -> "dua belas"
    const twoWordRegex = new RegExp(`\\b(${prefixes})(${tensUnits})\\b`, 'gi');
    res = res.replace(twoWordRegex, '$1 $2');

    return res;
}

/**
 * Normalizes spoken Indonesian text by preserving numeric decimals (dots and commas between digits),
 * expanding written fractions, segmenting unspaced STT numbers, and removing irrelevant punctuation.
 */
export function normalizeSpeechText(text: string): string {
    if (!text) return '';

    let s = text.toLowerCase();

    // 1. Expand written fraction notations before stripping slashes
    s = s.replace(/(\d+)\s+1\/2\b/g, '$1.5')
         .replace(/(\d+)\s+1\/4\b/g, '$1.25')
         .replace(/(\d+)\s+3\/4\b/g, '$1.75')
         .replace(/\b1\/2\b/g, '0.5')
         .replace(/\b1\/4\b/g, '0.25')
         .replace(/\b3\/4\b/g, '0.75');

    // 2. Normalize decimal comma between digits to dot (e.g. "85,5" -> "85.5", "8,5" -> "8.5")
    s = s.replace(/(\d+),(\d+)/g, '$1.$2');

    // 3. Handle standalone leading decimal dot/comma (e.g. ".5" or ",5" -> "0.5")
    s = s.replace(/(^|\s)[.,](\d+)/g, '$10.$2');

    // 4. Protect dots that are between digits by replacing with temporary placeholder
    s = s.replace(/(?<=\d)\.(?=\d)/g, 'XDOTX');

    // 5. Replace all other punctuation with spaces
    s = s.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ' ');

    // 6. Restore protected decimal dots
    s = s.replace(/XDOTX/g, '.');

    // 7. Expand unspaced numbers
    s = expandUnspacedNumbers(s);

    // 8. Collapse multiple whitespace and trim
    return s.replace(/\s+/g, ' ').trim();
}

