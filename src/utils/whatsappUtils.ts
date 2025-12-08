
/**
 * Utilities for WhatsApp integration
 */

export const createWhatsAppLink = (phoneNumber: string, message: string) => {
    // Remove non-digit chars
    let cleanNumber = phoneNumber.replace(/\D/g, '');

    // Ensure Indonesia country code (62)
    if (cleanNumber.startsWith('0')) {
        cleanNumber = '62' + cleanNumber.slice(1);
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
};

export const generateReportMessage = (studentName: string, averageScore: number, semester: string) => {
    return `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Kepada Yth. Ayahanda/Bunda wali murid dari ananda *${studentName}*,

Berikut kami sampaikan ringkasan hasil belajar (Rapor) untuk Semester ${semester}:

Rata-rata Nilai: *${averageScore}*

Mohon periksa laporan lengkapnya. Terima kasih atas kerja sama dan perhatian Ayahanda/Bunda.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.`;
};

export const generateAttendanceMessage = (studentName: string, status: string, date: string) => {
    return `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Kepada Yth. Ayahanda/Bunda wali murid dari ananda *${studentName}*,

Dengan ini kami menginformasikan bahwa pada tanggal ${date}, ananda tercatat *${status}*.

Mohon maklum dan terima kasih atas perhatiannya.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.`;
};
