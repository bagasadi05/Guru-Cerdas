import { Client } from 'pg';
import crypto from 'crypto';

const studentsList = [
    { name: "ADZRIEL FALAH ALFARIZQI", gender: "L" },
    { name: "ALTHAFARO MIRZA SANJAYA", gender: "L" },
    { name: "ARSYILA PRAMESWARI SETIAWAN", gender: "P" },
    { name: "AYRA SABRIA ALMAHYRA", gender: "P" },
    { name: "AZKA ELZEIN FAEYZA HARIYANTO", gender: "L" },
    { name: "BIANCA GANTARI ATMANEGARA", gender: "P" },
    { name: "HAIKAL ARRAHMAN RIYANTO", gender: "L" },
    { name: "HANNAN IMAM ABDURRAHMAN", gender: "L" },
    { name: "HILYA SALMA AISHA", gender: "P" },
    { name: "KAJEN BESUS SETIADIN", gender: "L" },
    { name: "KHAIRA SHIFA RANDITA", gender: "P" },
    { name: "MARYAM RUSYDAN AZZAHRA", gender: "P" },
    { name: "MIKAYLA AZZALEA PAMUJI", gender: "P" },
    { name: "MIKHAYLA ANINDYA ZAHIRA", gender: "P" },
    { name: "MOZELLE VECHIA", gender: "P" },
    { name: "MUHAMMAD AL FATIH RAFARDHAN FALAQ", gender: "L" },
    { name: "MUHAMMAD ARFAN ATHALLA", gender: "L" },
    { name: "MUHAMMAD YAHYA", gender: "L" },
    { name: "NADHIF AL JABBAR JULIANTOKO", gender: "L" },
    { name: "NAIRA FARZANA PUTRI", gender: "P" },
    { name: "NARARYA MAHAPRANA JANITRA", gender: "L" },
    { name: "RACHMATULLOH BAGUS WIJAYA", gender: "L" },
    { name: "RADITYA KRISHNA PUTRA SIGIT", gender: "L" },
    { name: "RUMAISHA SHALIHA AZZAHRA", gender: "P" },
    { name: "SANIY AR RAYYAN SILALAHI", gender: "L" },
    { name: "SARAH IZZATUNNISA AL YAFFIE", gender: "P" },
    { name: "SHABIRA SHANEEN HIDAJAYA", gender: "P" },
    { name: "SYAKILA NUNANESIA WIJAYA", gender: "P" },
    { name: "TYAGA MAGANI", gender: "L" },
    { name: "Narain Arrafif Avanoska".toUpperCase(), gender: "L" }
];

async function main() {
    const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
    });
    
    try {
        await client.connect();
        
        // Find Class 2A
        const classRes = await client.query("SELECT id, user_id FROM classes WHERE name IN ('2A', 'Kelas 2A') AND deleted_at IS NULL LIMIT 1");
        if (classRes.rows.length === 0) {
            console.error("Class 2A not found!");
            return;
        }
        
        const cls = classRes.rows[0];
        const classId = cls.id;
        
        let userId = cls.user_id;
        const studentRes = await client.query("SELECT user_id FROM students WHERE deleted_at IS NULL LIMIT 1");
        if (studentRes.rows.length > 0 && !userId) {
            userId = studentRes.rows[0].user_id;
        }
        
        console.log("Class ID:", classId, "User ID:", userId);

        // Soft delete all current students in 2A
        await client.query("UPDATE students SET deleted_at = NOW() WHERE class_id = $1", [classId]);
        console.log("Deleted old students.");

        // Insert new students
        let insertedCount = 0;
        for (const s of studentsList) {
            const genderFull = s.gender === 'L' ? 'Laki-laki' : 'Perempuan';
            const studentId = crypto.randomUUID();
            await client.query(`
                INSERT INTO students (id, name, class_id, gender, user_id, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `, [studentId, s.name, classId, genderFull, userId]);
            insertedCount++;
        }
        
        console.log(`✅ Successfully inserted ${insertedCount} new students for Class 2A.`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

main();
