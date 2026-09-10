
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

export const generateAttendanceSummaryMessage = (
    studentName: string,
    hadir: number,
    sakit: number,
    izin: number,
    alpha: number,
    rate: number
) => {
    return `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Kepada Yth. Orang Tua/Wali murid dari ananda *${studentName}*,

Berikut ringkasan rekapitulasi kehadiran ananda:
• Hadir: ${hadir} hari
• Sakit: ${sakit} hari
• Izin: ${izin} hari
• Tanpa Keterangan (Alpha): ${alpha} hari
Tingkat Kehadiran: *${rate}%*

${alpha > 0 || rate < 85 
    ? 'Mohon perhatian dan kerjasamanya untuk membimbing serta memastikan ananda dapat mengikuti pembelajaran dengan tertib.' 
    : 'Terima kasih atas kedisiplinan dan kerjasamanya dalam mendukung kehadiran ananda di sekolah.'}

Wassalamu'alaikum Warahmatullahi Wabarakatuh.`;
};
