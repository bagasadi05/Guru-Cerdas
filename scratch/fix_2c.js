import { Client } from 'pg';
import crypto from 'crypto';

const studentsList = [
    { name: "ADIFA ARINUR SALAMAH", gender: "P" },
    { name: "ADREENA SHEZA KHALISA", gender: "P" },
    { name: "AHDA MAUZA", gender: "L" },
    { name: "AISHA DIANDRA PRAMESTI", gender: "P" },
    { name: "ALFARIZQI ZAYDAN SISWANDI", gender: "L" },
    { name: "ALMAHYRA SHANUM HIDAYAT", gender: "P" },
    { name: "ALSYAKILA GRIZEL NUGRAHA", gender: "P" },
    { name: "AQILLA FARIZA MUFIA", gender: "P" },
    { name: "AQILA TSURAYYA ACHMAD", gender: "P" },
    { name: "ARSYA SAKINA DARIKH", gender: "P" },
    { name: "AZKA NARENDRA PUTRA", gender: "L" },
    { name: "BUMI BARAMERU SAHERTIAN", gender: "L" },
    { name: "CEISYA ISMAHENNA SHAQEENA ASHAD", gender: "P" },
    { name: "FATIH ADNAN NUGROHO", gender: "L" },
    { name: "FATTAH AZZAMI AHMAD", gender: "L" },
    { name: "GLADYSA RUBY AZKADINA", gender: "P" },
    { name: "JOVAN JANITRA PRAMUDI", gender: "L" },
    { name: "KHAYRA AYONA ADZKIYA", gender: "P" },
    { name: "M RIDWAN PUTRA HABIBURROHMAN", gender: "L" },
    { name: "MUHAMMAD AZMI AL GHAZALI", gender: "L" },
    { name: "MUHAMMAD HAIKAL ALTHAFAREZKI", gender: "L" },
    { name: "MUHAMMAD KEENAN SETIAWAN", gender: "L" },
    { name: "MYEISHA SHAZIA PUTRI", gender: "P" },
    { name: "NAILA AYUDIA CHRISTANTO", gender: "P" },
    { name: "QUEENZY ADVINCA LOVABI", gender: "P" },
    { name: "RAZKA FAUZAN KAMIL", gender: "L" },
    { name: "SEANDITO RIYANTARA ABDILLAH", gender: "L" },
    { name: "SHAKEELA BETHARI WAHYU ARRAYA", gender: "P" },
    { name: "ZAFRAN ARTANABIL", gender: "L" },
    { name: "ZIANKA MAFAZA ELSHANUM PRADIPTA", gender: "P" }
];

async function main() {
    const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
    });
    
    try {
        await client.connect();
        
        // Find Class 2C
        const classRes = await client.query("SELECT id, user_id FROM classes WHERE name IN ('2C', 'Kelas 2C') AND deleted_at IS NULL LIMIT 1");
        if (classRes.rows.length === 0) {
            console.error("Class 2C not found!");
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

        // Soft delete all current students in 2C
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
        
        console.log(`✅ Successfully inserted ${insertedCount} new students for Class 2C.`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

main();
