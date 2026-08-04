import { Client } from 'pg';
import crypto from 'crypto';

const studentsList = [
    { name: "ABIZARD AUSHAF ALFATIH", gender: "L" },
    { name: "ABYAN ALFARIZI KURNIAWAN", gender: "L" },
    { name: "AL BARRA MAHARAJA YUDIANTO", gender: "L" },
    { name: "AL FAIZ REYHAN PRANADIPTA", gender: "L" },
    { name: "ALYSSA SABHIRA AZZAHRA", gender: "P" },
    { name: "AQILLA FARIZA MUFIA", gender: "P" },
    { name: "ARBI GAISHAN PAHLEVI", gender: "L" },
    { name: "ARJUNA BINTANG GIRISYAWARDHANA", gender: "L" },
    { name: "ARSHEILA KHAYLILA ALRAEN", gender: "P" },
    { name: "ARSYILA RIZA SUNGKAR", gender: "P" },
    { name: "ARSYILA SABIYA RAESHA", gender: "P" },
    { name: "ATTHAYA BILAL MA'ARIF", gender: "L" },
    { name: "AULIA ALMIRA ZAQISYA", gender: "P" },
    { name: "AULIYA YASMIN KUSUMA", gender: "P" },
    { name: "AURISTELLA DEVIANDRA AIDA RAMADHANI", gender: "P" },
    { name: "AZRIL HENDRO RAMADHIAN", gender: "L" },
    { name: "HAFIDZAN AL FATIH MAULANA", gender: "L" },
    { name: "JUNA AL FAATIH SABILILLAH", gender: "L" },
    { name: "KIRANA KHAIRUNNISA", gender: "P" },
    { name: "KURNIA EL KAFF FAEYZA", gender: "L" },
    { name: "MAHIRA ERVI NADHIFA", gender: "P" },
    { name: "MUHAMMAD UWAIS ZAGY AL QORNY", gender: "L" },
    { name: "NEIVA ALMAHYRA WARDANA", gender: "P" },
    { name: "PRINCESSA NAZNEEN SHAZIA ERGIANSYAH", gender: "P" },
    { name: "RAJENDRA RIHMECCA ALKHARIS", gender: "L" },
    { name: "RAKI ZADA ZAYN", gender: "L" },
    { name: "SHAFEEA AERILYN YONNA", gender: "P" },
    { name: "SULTHAN ARRASYID SAKHI", gender: "L" },
    { name: "UWAIS AL QARNI", gender: "L" },
    { name: "WILDAN ATHAYA FATTAN PRAWIRO", gender: "L" },
    { name: "ZAHWA RADITYA PUTRI ARDANI", gender: "P" }
];

async function main() {
    const client = new Client({
        connectionString: process.env.SUPABASE_DB_URL,
    });
    
    try {
        await client.connect();
        
        // Find Class 3C
        const classRes = await client.query("SELECT id, user_id FROM classes WHERE name IN ('3C', 'Kelas 3C') AND deleted_at IS NULL LIMIT 1");
        if (classRes.rows.length === 0) {
            console.error("Class 3C not found!");
            return;
        }
        
        const cls = classRes.rows[0];
        const classId = cls.id;
        
        // Find existing student's user_id in case class doesn't have it (or we can just use the class's user_id)
        let userId = cls.user_id;
        const studentRes = await client.query("SELECT user_id FROM students WHERE deleted_at IS NULL LIMIT 1");
        if (studentRes.rows.length > 0 && !userId) {
            userId = studentRes.rows[0].user_id;
        }
        
        console.log("Class ID:", classId, "User ID:", userId);

        // Soft delete all current students in 3C
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
        
        console.log(`✅ Successfully inserted ${insertedCount} new students for Class 3C.`);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

main();
