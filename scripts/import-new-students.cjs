const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const students6C = [
  {nis:"210975",nisn:"0141396695",name:"ADELINA DIANDRA WIJAYA",gender:"perempuan"},
  {nis:"210977",nisn:"0156695386",name:"AHNAF HAIDAR FAHMI",gender:"laki-laki"},
  {nis:"210978",nisn:"0146643270",name:"AKMA SHAKILA KHAIRINA",gender:"perempuan"},
  {nis:"210980",nisn:"0145762724",name:"ALI AUNNILLA BAHADJ",gender:"laki-laki"},
  {nis:"210983",nisn:"0147135846",name:"ALVARO CALYA ZIGGY FAUSTAN",gender:"laki-laki"},
  {nis:"210986",nisn:"0142135166",name:"AMALIA PUTRI ANJANI",gender:"perempuan"},
  {nis:"210987",nisn:"3148324385",name:"AMARANGGANA KINNARA PRASETYO",gender:"perempuan"},
  {nis:"000000",nisn:"3141121820",name:"ANOM ANANTA PUTRA",gender:"laki-laki"},
  {nis:"210999",nisn:"0149162939",name:"AZFAR PUTRA YURI",gender:"laki-laki"},
  {nis:"211000",nisn:"0151548727",name:"AZKIYA NAFISA NUGROHO",gender:"perempuan"},
  {nis:"211001",nisn:"0156974681",name:"AZZAHRA RAFANDA ZHAFIRAH",gender:"perempuan"},
  {nis:"211003",nisn:"0159778982",name:"BELAID MUHAMMAD ABD EL RAOUF",gender:"laki-laki"},
  {nis:"211004",nisn:"3148874870",name:"BILQIS ZHARUFA HAWIN AFIQAH",gender:"perempuan"},
  {nis:"211010",nisn:"0149892732",name:"DE ATTAR ALFAREZ FERDIAN",gender:"laki-laki"},
  {nis:"251378",nisn:"0143134483",name:"FATHAN ARSYANENDRA PURNOMO",gender:"laki-laki"},
  {nis:"210070",nisn:"0144940544",name:"HAGIA SOPHIA NAIRA RACHMAN",gender:"perempuan"},
  {nis:"211020",nisn:"0131545619",name:"INA AMINATUS ZAHRO",gender:"perempuan"},
  {nis:"211021",nisn:"0145144414",name:"IRFAN NISMARA SETIAWAN",gender:"laki-laki"},
  {nis:"211024",nisn:"0147482125",name:"KAYLA PRAMUDITA AZALIA",gender:"perempuan"},
  {nis:"211026",nisn:"0146833170",name:"KEANU ABIDZAR RACHMAN",gender:"laki-laki"},
  {nis:"211027",nisn:"0148875305",name:"KEISHA LARASATI RAHARDIYANTO",gender:"perempuan"},
  {nis:"211029",nisn:"0145705146",name:"KHANSA AQILA QOTRUNNADA",gender:"perempuan"},
  {nis:"221186",nisn:"0156821669",name:"MICHELLA AMAIRA RAHMANI KUSUMA",gender:"perempuan"},
  {nis:"211033",nisn:"0158338680",name:"MIKHAEELA ALLESSANDRA SYAHIRA",gender:"perempuan"},
  {nis:"211035",nisn:"0145340296",name:"MUHAMMAD DASTAN AL-KHALEF ANDI MAKMUR",gender:"laki-laki"},
  {nis:"211043",nisn:"0156339708",name:"NUR SYIFA KUSUMA AYU",gender:"perempuan"},
  {nis:"211049",nisn:"3159834288",name:"RAFLI HABIBULLAH GHANI PRASOJO",gender:"laki-laki"},
  {nis:"211054",nisn:"0149363292",name:"REVANO NAUVAL PRATAMA",gender:"laki-laki"},
  {nis:"211356",nisn:"0155906979",name:"RUBY ALIYA DEWINA MARYAM",gender:"perempuan"},
  {nis:"211057",nisn:"0149226773",name:"SAFIA PARAMITA MADINA",gender:"perempuan"},
  {nis:"211059",nisn:"0152064377",name:"SHAIRA HASNA AZKADINA",gender:"perempuan"},
  {nis:"211062",nisn:"0146737289",name:"TALITA HASNA KHUMAIRA",gender:"perempuan"}
];

const students5C = [
  {name:"AFFAN JULIAN ALFARIZI YUSUF",gender:"laki-laki"},
  {name:"AISYAH AQILLA PUTRI",gender:"perempuan"},
  {name:"ALIFYA AZZAHRA KHAIRUNNISA",gender:"perempuan"},
  {name:"ANDRIANO HAMIZAN PANDYA WARDANA",gender:"laki-laki"},
  {name:"ARKHA FAYYADH SISWANDI",gender:"laki-laki"},
  {name:"ARSALAN ZIO SOLHIDAR ASKARI",gender:"laki-laki"},
  {name:"ARSYAD ZHAFRAN ABQARI",gender:"laki-laki"},
  {name:"ATHALLA GIBRAN DWIKA PUTRA",gender:"laki-laki"},
  {name:"AYSHA AZZAHRA THAMRIN",gender:"perempuan"},
  {name:"BELLVANIA AZZAHRA NISTRIANTO",gender:"perempuan"},
  {name:"BHAGAWANTA ALFARIZQI PRADITA",gender:"laki-laki"},
  {name:"BONDAN MAHESA ZAFRAN SYAH",gender:"laki-laki"},
  {name:"HASNA AKIKO ISWAHYUNI",gender:"perempuan"},
  {name:"KAYSHA AZIZA INDITA",gender:"perempuan"},
  {name:"KHANZA ARSYILA DARMAWAN",gender:"perempuan"},
  {name:"MIKHAYLA ADRIEN CLARETTA",gender:"perempuan"},
  {name:"MUHAMMAD MUSA",gender:"laki-laki"},
  {name:"MUHAMMAD RAFFASYA ALFARIZQI PRADIPTA",gender:"laki-laki"},
  {name:"NABILA SAFIRA KHAIRUNNISA",gender:"perempuan"},
  {name:"NADHIRA NUSAIBAH PUTRI ISPRIONO",gender:"perempuan"},
  {name:"NADINE RIZKY DEFRIAN AKHYAR",gender:"perempuan"},
  {name:"NAJWA AISYAH PUSPITA",gender:"perempuan"},
  {name:"NAUFAL ADLAN RAIHAN ALIYAN",gender:"laki-laki"},
  {name:"PUTRA SADA ALGHIFARI",gender:"laki-laki"},
  {name:"R. REY ARSY MAHINDRAJAYA",gender:"laki-laki"},
  {name:"RADITYA SENA NUGRAHA",gender:"laki-laki"},
  {name:"RAFARDHAN DHAFIR NURWANTO",gender:"laki-laki"},
  {name:"REVALENA AURELLY PUTRI WARDHANA",gender:"perempuan"},
  {name:"RR. AIMILIONAMORA ADHITAMA RAYA",gender:"perempuan"}
];

const students2C = [
  {name:"ADIFA ARINUR SALAMAH",gender:"perempuan"},
  {name:"ADREENA SHEZA KHALISA",gender:"perempuan"},
  {name:"AHDA MAUZA",gender:"laki-laki"},
  {name:"AISHA DIANDRA PRAMESTI",gender:"perempuan"},
  {name:"ALFARIZQI ZAYDAN SISWANDI",gender:"laki-laki"},
  {name:"ALMAHYRA SHANUM HIDAYAT",gender:"perempuan"},
  {name:"ALSYAKILA GRIZEL NUGRAHA",gender:"perempuan"},
  {name:"AQILLA FARIZA MUFIA",gender:"perempuan"},
  {name:"AQILA TSURAYYA ACHMAD",gender:"perempuan"},
  {name:"ARSYA SAKINA DARIKH",gender:"perempuan"},
  {name:"AZKA NARENDRA PUTRA",gender:"laki-laki"},
  {name:"BUMI BARAMERU SAHERTIAN",gender:"laki-laki"},
  {name:"CEISYA ISMAHENNA SHAQEENA ASHAD",gender:"perempuan"},
  {name:"FATIH ADNAN NUGROHO",gender:"laki-laki"},
  {name:"FATTAH AZZAMI AHMAD",gender:"laki-laki"},
  {name:"GLADYSA RUBY AZKADINA",gender:"perempuan"},
  {name:"JOVAN JANITRA PRAMUDI",gender:"laki-laki"},
  {name:"KHAYRA AYONA ADZKIYA",gender:"perempuan"},
  {name:"M RIDWAN PUTRA HABIBURROHMAN",gender:"laki-laki"},
  {name:"MUHAMMAD AZMI AL GHAZALI",gender:"laki-laki"},
  {name:"MUHAMMAD HAIKAL ALTHAFAREZKI",gender:"laki-laki"},
  {name:"MUHAMMAD KEENAN SETIAWAN",gender:"laki-laki"},
  {name:"MYEISHA SHAZIA PUTRI",gender:"perempuan"},
  {name:"NAILA AYUDIA CHRISTANTO",gender:"perempuan"},
  {name:"QUEENZY ADVINCA LOVABI",gender:"perempuan"},
  {name:"RAZKA FAUZAN KAMIL",gender:"laki-laki"},
  {name:"SEANDITO RIYANTARA ABDILLAH",gender:"laki-laki"},
  {name:"SHAKEELA BETHARI WAHYU ARRAYA",gender:"perempuan"},
  {name:"ZAFRAN ARTANABIL",gender:"laki-laki"},
  {name:"ZIANKA MAFAZA ELSHANUM PRADIPTA",gender:"perempuan"}
];

async function insertStudents(className, studentList) {
  console.log(`Processing class ${className}...`);
  // Get Class ID
  const { data: clsData, error: clsError } = await supabase
    .from('classes')
    .select('id')
    .eq('name', className)
    .single();

  if (clsError) {
    console.error(`Error finding class ${className}:`, clsError);
    return;
  }
  const classId = clsData.id;
  console.log(`Found class ${className} with ID ${classId}`);

  // Insert students
  const inserts = studentList.map((s, i) => ({
    name: s.name,
    gender: s.gender === 'laki-laki' ? 'Laki-laki' : 'Perempuan',
    class_id: classId,
    user_id: '3946643b-f51d-4378-b139-2df060aba2f4'
  }));

  const { data, error } = await supabase
    .from('students')
    .insert(inserts)
    .select();

  if (error) {
    console.error(`Error inserting into ${className}:`, error);
  } else {
    console.log(`Successfully inserted ${data.length} students into ${className}`);
  }
}

async function main() {
  await insertStudents('Kelas 2C', students2C);
  await insertStudents('Kelas 5C', students5C);
  await insertStudents('Kelas 6C', students6C);
}

main().catch(console.error);
