
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

export interface ViolationMessageData {
    description: string;
    points: number;
    date: string;
    severity?: string | null;
    context_notes?: string | null;
    recorded_by_name?: string | null;
}

export const generateViolationMessage = (
    studentName: string,
    violation: ViolationMessageData,
    parentName?: string | null
) => {
    const formattedDate = new Date(violation.date).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
    const parentGreeting = parentName
        ? `Bapak/Ibu *${parentName}* (Wali dari ananda *${studentName}*)`
        : `Ayahanda/Bunda wali murid dari ananda *${studentName}*`;

    return `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Kepada Yth. ${parentGreeting},

Kami dari pihak sekolah ingin menyampaikan catatan tata tertib siswa atas ananda *${studentName}*:

📋 *Pelanggaran:* ${violation.description}
📅 *Hari/Tanggal:* ${formattedDate}
⚠️ *Poin Pelanggaran:* +${violation.points} Poin ${violation.severity ? `(${violation.severity.toUpperCase()})` : ''}
${violation.context_notes ? `📝 *Kronologi/Keterangan:* ${violation.context_notes}\n` : ''}${violation.recorded_by_name ? `👤 *Dicatat oleh:* ${violation.recorded_by_name}\n` : ''}
Catatan ini kami sampaikan sebagai bentuk keterbukaan informasi dan ikhtiar bersama agar kita dapat membimbing ananda menjadi pribadi yang lebih beradab, berdisiplin, dan berkarakter mulia.

Mohon perhatian serta bimbingan Ayahanda/Bunda kepada ananda di rumah. Terima kasih banyak atas kerja sama yang baik.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.`;
};

export interface BintangMonthlyMessageGrades {
    adab: string;
    kedisiplinan: string;
    kerapian: string;
    catatan?: string | null;
}

export const generateBintangMonthlyMessage = (
    studentName: string,
    month: string,
    grades: BintangMonthlyMessageGrades,
    parentName?: string | null
) => {
    const parentGreeting = parentName
        ? `Bapak/Ibu *${parentName}* (Wali dari ananda *${studentName}*)`
        : `Ayahanda/Bunda wali murid dari ananda *${studentName}*`;

    return `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Kepada Yth. ${parentGreeting},

Berikut kami sampaikan ringkasan capaian Rapor BINTANG (Karakter & Pembiasaan) ananda *${studentName}* untuk periode *${month}*:

⭐ *Nilai Karakter & Pembiasaan:*
• Adab: *${grades.adab}*
• Kedisiplinan: *${grades.kedisiplinan}*
• Kerapian: *${grades.kerapian}*
${grades.catatan ? `\n📝 *Catatan Wali Kelas:*\n"${grades.catatan}"\n` : ''}
Semoga ananda terus bersemangat meningkatkan akhlak dan kedisiplinan baik di sekolah maupun di rumah.

Terima kasih atas kerja sama dan pendampingan Ayahanda/Bunda.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.`;
};

export const generateStudentConcernMessage = (
    studentName: string,
    violationCount: number,
    className?: string | null,
    parentName?: string | null
) => {
    const parentGreeting = parentName
        ? `Bapak/Ibu *${parentName}* (Wali dari ananda *${studentName}*)`
        : `Ayahanda/Bunda wali murid dari ananda *${studentName}*`;

    return `Assalamu'alaikum Warahmatullahi Wabarakatuh,

Kepada Yth. ${parentGreeting},

Kami dari pihak sekolah/madrasah ingin mengajak Ayahanda/Bunda untuk berkoordinasi dan berdiskusi bersama terkait perkembangan kedisiplinan ananda *${studentName}*${className ? ` (${className})` : ''}.

Saat ini ananda tercatat memiliki *${violationCount} catatan pelanggaran/pembinaan* pada semester ini.

Pemberitahuan ini kami sampaikan dengan niat baik agar kita dapat bersinergi antara pihak madrasah dan keluarga untuk membimbing ananda menjadi pribadi yang lebih baik dan disiplin.

Mohon konfirmasi waktu luang Ayahanda/Bunda untuk berdiskusi lebih lanjut. Terima kasih banyak atas perhatian dan kerja samanya.

Wassalamu'alaikum Warahmatullahi Wabarakatuh.`;
};


