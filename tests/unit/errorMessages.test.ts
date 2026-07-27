import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseError, getErrorCode, formatErrorMessage } from '../../src/utils/errorMessages';

describe('errorMessages utilities', () => {
  // Mock navigator.onLine since the code uses it
  const originalOnLine = navigator.onLine;

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      value: originalOnLine,
      configurable: true,
    });
  });

  const setOnline = (isOnline: boolean) => {
    Object.defineProperty(navigator, 'onLine', {
      value: isOnline,
      configurable: true,
    });
  };

  describe('parseError', () => {
    it('should return OFFLINE when navigator is offline', () => {
      setOnline(false);
      const result = parseError(new Error('Some error'));
      expect(result.title).toBe('Mode Offline');
      setOnline(true);
    });

    it('should parse Error objects by message keywords', () => {
      setOnline(true);
      
      expect(parseError(new Error('Network request failed')).title).toBe('Koneksi Terputus');
      expect(parseError(new Error('Connection timed out')).title).toBe('Waktu Habis');
      expect(parseError(new Error('401 Unauthorized')).title).toBe('Sesi Berakhir');
      expect(parseError(new Error('User is forbidden 403')).title).toBe('Akses Ditolak');
      expect(parseError(new Error('Page not found (404)')).title).toBe('Data Tidak Ditemukan');
      expect(parseError(new Error('Data already exists (409)')).title).toBe('Konflik Data');
      expect(parseError(new Error('Validation failed')).title).toBe('Data Tidak Valid');
      expect(parseError(new Error('Internal server error (500)')).title).toBe('Kesalahan Server');
      expect(parseError(new Error('Too many requests (429)')).title).toBe('Kuota Terlampaui');
      expect(parseError(new Error('Random unknown issue')).title).toBe('Terjadi Kesalahan');
    });

    it('should parse HTTP response objects by status code', () => {
      setOnline(true);

      expect(parseError({ status: 401 }).title).toBe('Sesi Berakhir');
      expect(parseError({ status: 403 }).title).toBe('Akses Ditolak');
      expect(parseError({ status: 404 }).title).toBe('Data Tidak Ditemukan');
      expect(parseError({ status: 409 }).title).toBe('Konflik Data');
      expect(parseError({ status: 422 }).title).toBe('Data Tidak Valid');
      expect(parseError({ status: 429 }).title).toBe('Kuota Terlampaui');
      expect(parseError({ status: 500 }).title).toBe('Kesalahan Server');
      expect(parseError({ status: 503 }).title).toBe('Kesalahan Server');
      expect(parseError({ status: 418 }).title).toBe('Terjadi Kesalahan'); // Unmapped status
    });

    it('should fallback to UNKNOWN for other inputs', () => {
      setOnline(true);
      
      expect(parseError('Just a string').title).toBe('Terjadi Kesalahan');
      expect(parseError(null).title).toBe('Terjadi Kesalahan');
      expect(parseError(undefined).title).toBe('Terjadi Kesalahan');
    });
  });

  describe('getErrorCode', () => {
    it('should return the correct ErrorCode string', () => {
      setOnline(true);
      expect(getErrorCode(new Error('network issue'))).toBe('NETWORK_ERROR');
      expect(getErrorCode({ status: 404 })).toBe('NOT_FOUND');
      
      setOnline(false);
      expect(getErrorCode(new Error('any error'))).toBe('OFFLINE');
      setOnline(true);
    });
  });

  describe('formatErrorMessage', () => {
    it('should return a formatted string combining title and message', () => {
      setOnline(true);
      const str = formatErrorMessage(new Error('404 not found'));
      expect(str).toBe('Data Tidak Ditemukan: Data yang Anda cari tidak ada atau telah dihapus.');
    });
  });
});
